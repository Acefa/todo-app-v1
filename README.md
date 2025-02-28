/**
 * 项目整体架构
 */

1. 用户认证流程 {
    - 使用 Clerk 进行用户认证
    - 登录/注册页面: /login, /signup
    - 认证中间件: middleware.ts 保护需要登录的路由
}

2. 数据库结构 {
    profiles表: {
        - 存储用户基本信息
        - 会员等级(free/pro)
        - Stripe订阅相关信息
    }
    
    todos表: {
        - 存储用户的待办事项
        - 与用户通过user_id关联
    }
}

3. 核心功能流程 {
    待办事项功能: {
        - 仅限pro会员访问
        - CRUD操作
        - 实时更新
    }
    
    会员订阅: {
        1. 用户访问定价页面
        2. 选择订阅计划(月付/年付)
        3. 跳转Stripe支付
        4. Webhook处理支付结果
        5. 更新用户会员状态
    }
}

4. 权限控制 {
    - 未登录用户 -> 重定向到登录
    - 免费用户 -> 重定向到定价页
    - 付费用户 -> 可访问全部功能
}


用户注册/登录流程 {
    1. 用户通过Clerk注册/登录
    2. 首次注册时创建用户profile
    3. 默认为free会员
}

订阅流程 {
    1. 免费用户访问/todo -> 重定向到/pricing
    2. 选择订阅计划，点击订阅按钮
    3. 跳转到Stripe支付页面
    4. 支付成功后，Stripe发送webhook到我们的服务器
    5. webhook处理器更新用户状态为pro
    6. 用户可以开始使用todo功能
}

Todo功能权限控制 {
    if (未登录) {
        重定向到登录页
    } else if (免费用户) {
        重定向到定价页
    } else {
        允许访问Todo功能
    }
}

关键文件功能
文件结构 {
    middleware.ts: {
        - 路由保护
        - 权限验证
    }
    
    actions/stripe-actions.ts: {
        - 处理Stripe支付
        - 更新会员状态
    }
    
    db/queries/*: {
        - 数据库操作
        - CRUD功能
    }
    
    app/api/stripe/webhooks/route.ts: {
        - 处理Stripe回调
        - 更新订阅状态
    }
}


技术栈
技术选型 {
    前端: {
        - Next.js
        - React
        - Tailwind CSS
    }
    
    后端: {
        - Next.js API Routes
        - Drizzle ORM
    }
    
    数据库: {
        - PostgreSQL (Supabase)
    }
    
    第三方服务: {
        - Clerk (认证)
        - Stripe (支付)
    }
}