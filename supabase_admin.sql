--======================================================================
-- 咕噜 ==存钱 Admin Portal 后台管理系统 - 数据库配置与权限控制脚本
-- 
-- 执行步骤：
-- 请复制以下所有 SQL 代码，粘贴至您的 Supabase Dashboard -> SQL Editor 中运行。
-- ========================================================================

-- 1. 创建表单提交信息记录表 (contact_submissions)
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    full_name text NOT NULL,
    email text NOT NULL,
    topic text NOT NULL,
    message text NOT NULL,
    phone text,
    company text,
    source_url text,
    user_agent text,
    status text DEFAULT 'new'::text NOT NULL -- 状态值可选：'new' (新提交) 或 'handled' (已处理)
);

-- 2. 创建管理员用户白名单表 (admin_users)
CREATE TABLE IF NOT EXISTS public.admin_users (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. 启用数据表的 Row Level Security (RLS) 行级安全策略，防止越权读写
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- 4. 针对 contact_submissions 表配置 RLS 安全策略

-- 策略 A: 允许任何访客 (未登录或登录用户) 插入新的留言表单数据 (INSERT)
CREATE POLICY "Allow anyone to insert submissions" 
ON public.contact_submissions 
FOR INSERT 
WITH CHECK (true);

-- 策略 B: 仅限存在于 admin_users 表中的管理员读取表单列表及详情 (SELECT)
CREATE POLICY "Allow admin users to select submissions" 
ON public.contact_submissions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

-- 策略 C: 仅限管理员更新表单处理状态 (UPDATE)
CREATE POLICY "Allow admin users to update submissions" 
ON public.contact_submissions 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);

-- 5. 针对 admin_users 表配置 RLS 安全策略

-- 策略 D: 允许登录用户检查自己是否在管理员白名单中 (SELECT)
CREATE POLICY "Allow users to select their own admin status" 
ON public.admin_users 
FOR SELECT 
USING (auth.uid() = user_id);

-- 6. 创建提升/撤销管理员特权的安全 RPC 函数 (由管理员在前端调用)
-- 作用：通过定义 SECURITY DEFINER，在执行函数内部提权，并内置多重安全防护机制。
CREATE OR REPLACE FUNCTION public.toggle_admin_status(
  target_user_id uuid,
  make_admin boolean
)
RETURNS void AS $$
BEGIN
  -- 安全拦截：调用者本身必须已经是 admin_users 成员
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access Denied: Only existing administrators can manage admin roles.';
  END IF;

  -- 执行提权或撤权操作
  IF make_admin = true THEN
    INSERT INTO public.admin_users (user_id)
    VALUES (target_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    -- 级联安全防护：防止当前操作的管理员将自己撤权，造成系统无可用管理员的死锁状态
    IF target_user_id = auth.uid() THEN
      RAISE EXCEPTION 'Self Demotion Blocked: You cannot revoke your own admin rights.';
    END IF;
    DELETE FROM public.admin_users WHERE user_id = target_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
