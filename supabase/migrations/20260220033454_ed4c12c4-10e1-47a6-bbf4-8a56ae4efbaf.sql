
-- =============================================
-- Migration 2: Branch scoping tables, columns, data, RLS
-- =============================================

-- 1. Create branches table
CREATE TABLE public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  province TEXT,
  city TEXT,
  district TEXT,
  village TEXT,
  postal_code VARCHAR(10),
  full_address TEXT,
  phone VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Create user_branches (many-to-many)
CREATE TABLE public.user_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  UNIQUE(user_id, branch_id)
);
ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;

-- 3. Security definer functions
CREATE OR REPLACE FUNCTION public.get_user_branch_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT branch_id FROM public.user_branches WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.user_has_branch_access(_user_id UUID, _branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT 
    public.has_role(_user_id, 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.user_branches
      WHERE user_id = _user_id AND branch_id = _branch_id
    );
$$;

-- 4. Add branch_id to transactional tables
ALTER TABLE public.stock_units ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.opname_sessions ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.opname_schedules ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.flash_sale_settings ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.activity_logs ADD COLUMN branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.catalog_products ADD COLUMN branch_id UUID REFERENCES public.branches(id);

-- 5. Seed initial branch
INSERT INTO public.branches (id, name, code, city, province, full_address)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Cabang Surabaya', 'SBY', 'Kota Surabaya', 'Jawa Timur', 'Surabaya, Jawa Timur'
);

-- 6. Assign existing data to Cabang Surabaya
UPDATE public.stock_units SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE public.opname_sessions SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE public.opname_schedules SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE public.flash_sale_settings SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE public.activity_logs SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;
UPDATE public.catalog_products SET branch_id = '00000000-0000-0000-0000-000000000001' WHERE branch_id IS NULL;

-- 7. Migrate existing admin roles to admin_branch
UPDATE public.user_roles SET role = 'admin_branch' WHERE role = 'admin';

-- 8. Assign existing users to initial branch
INSERT INTO public.user_branches (user_id, branch_id, is_default)
SELECT ur.user_id, '00000000-0000-0000-0000-000000000001', true
FROM public.user_roles ur
WHERE ur.role IN ('super_admin', 'admin_branch')
ON CONFLICT (user_id, branch_id) DO NOTHING;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Branches
CREATE POLICY "public_read_active_branches" ON public.branches
  FOR SELECT USING (is_active = true);
CREATE POLICY "superadmin_manage_branches" ON public.branches
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- User_branches
CREATE POLICY "users_read_own_branches" ON public.user_branches
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "superadmin_manage_all_user_branches" ON public.user_branches
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "admin_branch_read_same_branch_users" ON public.user_branches
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin_branch')
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );
CREATE POLICY "admin_branch_manage_same_branch" ON public.user_branches
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin_branch')
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );
CREATE POLICY "admin_branch_delete_same_branch" ON public.user_branches
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin_branch')
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );

-- Update catalog_products: admin -> admin_branch
DROP POLICY IF EXISTS "admin_update_catalog_limited" ON public.catalog_products;
CREATE POLICY "admin_branch_update_catalog" ON public.catalog_products
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin_branch')
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin_branch')
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );

-- Branch-scoped stock_units
CREATE POLICY "branch_scoped_read_stock" ON public.stock_units
  FOR SELECT USING (
    (public.has_role(auth.uid(), 'admin_branch') OR public.has_role(auth.uid(), 'employee'))
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );
CREATE POLICY "admin_branch_insert_stock" ON public.stock_units
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin_branch')
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );
CREATE POLICY "admin_branch_update_stock" ON public.stock_units
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin_branch')
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin_branch')
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );

-- Branch-scoped opname_sessions
CREATE POLICY "branch_scoped_read_opname" ON public.opname_sessions
  FOR SELECT USING (
    (public.has_role(auth.uid(), 'admin_branch') OR public.has_role(auth.uid(), 'employee'))
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );
CREATE POLICY "branch_scoped_insert_opname" ON public.opname_sessions
  FOR INSERT WITH CHECK (
    (public.has_role(auth.uid(), 'admin_branch') OR public.has_role(auth.uid(), 'employee'))
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );
CREATE POLICY "branch_scoped_update_opname" ON public.opname_sessions
  FOR UPDATE USING (
    (public.has_role(auth.uid(), 'admin_branch') OR public.has_role(auth.uid(), 'employee'))
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );

-- Activity logs for admin_branch & employee
CREATE POLICY "admin_branch_read_activity_logs" ON public.activity_logs
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin_branch')
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );
CREATE POLICY "admin_branch_insert_activity_logs" ON public.activity_logs
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin_branch')
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );
CREATE POLICY "employee_insert_activity_logs" ON public.activity_logs
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'employee')
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );

-- Employee read stock (via branch_scoped_read_stock already covers this)
-- Employee read opname (via branch_scoped_read_opname already covers this)

-- Employee insert scanned items (already covered by existing authenticated policies)
-- Employee read catalog for their branch
CREATE POLICY "branch_scoped_read_catalog" ON public.catalog_products
  FOR SELECT USING (
    (public.has_role(auth.uid(), 'admin_branch') OR public.has_role(auth.uid(), 'employee'))
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );

-- Flash sale branch scoped
CREATE POLICY "branch_scoped_flash_sale" ON public.flash_sale_settings
  FOR ALL USING (
    (public.has_role(auth.uid(), 'admin_branch') OR public.has_role(auth.uid(), 'employee'))
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin_branch')
    AND branch_id IN (SELECT public.get_user_branch_ids(auth.uid()))
  );
