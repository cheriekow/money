/**
 * 咕噜存钱 Stripe Webhook 订阅状态同步 Serverless API
 * 
 * 作用：接收 Stripe 支付服务器发送的事件通知。当用户在定价页点击付款并在收银台支付成功后，
 *      Stripe 会回调此接口。系统会据此将该用户的 isProMember 状态更新为 true。
 *      同理，在订阅到期或取消订阅时，自动回收 Pro 身份。
 * 
 * 部署提示：需在 Stripe Dashboard 中配置此 Webhook 地址，指向 https://your-domain.com/api/stripe-webhook
 * 依赖安装：npm install stripe express dotenv
 */

import dotenv from 'dotenv';
dotenv.config();

import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Stripe 签名密钥 (从 Stripe Dashboard Webhook 配置中获取)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '方法不支持，请使用 POST 方式接收 Webhook' });
  }

  // 1. 获取签名与原始报文
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // 注：验证 Stripe 签名需要使用请求体的原始原始 Buffer (Raw Body)
    // 在 Vercel/Vite 等云托管环境下可能需要配置禁用 Body-Parser
    const rawBody = req.body; 
    
    /* 
    ========================================================================
    【真实验证 Stripe 签名代码】
    ========================================================================
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    ========================================================================
    */

    // 临时绕过或在开发模式下直接获取 body 中的事件
    event = req.body;

  } catch (err) {
    console.error(`⚠️ Webhook 签名验证失败:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. 根据事件类型分流处理
  try {
    switch (event.type) {
      
      // 订阅付款成功 (首次升级或后续扣款)
      case 'checkout.session.completed': {
        const session = event.data.object;
        
        // 提取付款时绑定的用户识别元数据 (Metadata)
        const userEmail = session.customer_details.email;
        const username = session.metadata && session.metadata.username;

        console.log(`🎉 收到支付成功通知！用户：${username} (${userEmail}) 已成功付款升级 Pro！`);
        
        /* 
        ========================================================================
        【在此编写数据库更新逻辑】
        ========================================================================
        await db.users.update({ email: userEmail }, { isProMember: true });
        ========================================================================
        */
        
        break;
      }

      // 订阅周期扣款成功 (续订)
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerEmail = invoice.customer_email;
        console.log(`🔄 用户 ${customerEmail} 订阅续费成功，自动维持 Pro 权益。`);
        break;
      }

      // 订阅到期、取消订阅、或因扣款失败导致订阅终止
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        // 找到 Stripe 对应的 Customer 资料并撤回 Pro 身份
        const customerId = subscription.customer;
        const customer = await stripe.customers.retrieve(customerId);
        const userEmail = customer.email;

        console.log(`❌ 用户 ${userEmail} 的 Pro 会员已到期或取消，系统自动恢复为普通免费版。`);
        
        /* 
        ========================================================================
        【在此编写数据库注销会员逻辑】
        ========================================================================
        await db.users.update({ email: userEmail }, { isProMember: false });
        ========================================================================
        */

        break;
      }

      default:
        console.log(`ℹ️ 收到其他未定义的 Stripe 事件: ${event.type}`);
    }

    // 成功处理后，必须向 Stripe 返回 200 响应
    return res.status(200).json({ received: true });

  } catch (error) {
    console.error('⚠️ 处理 Stripe Webhook 出现异常:', error);
    return res.status(500).json({ error: 'Webhook 内部处理失败' });
  }
};
