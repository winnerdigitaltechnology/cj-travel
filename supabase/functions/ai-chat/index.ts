// CJ的漫旅 · AI 聊天代理
// 部署到 Supabase Edge Functions，安全隐藏 DeepSeek API Key

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // 处理 CORS 预检
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ---- 1. 验证用户身份 ----
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "请先登录" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- 2. 解析请求 ----
    const body = await req.json();
    const { messages, itinerary_id } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages 不能为空" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- 3. 注入系统提示词 ----
    const systemPrompt = {
      role: "system",
      content: `你是一位资深的旅行规划师，名叫"CJ的漫旅AI"。你的任务是为用户提供专业、详细的旅行行程规划建议。

要求：
- 用中文回复，风格热情、专业
- 如果用户提供目的地和天数，给出逐日行程（上午/下午/晚上）
- 推荐具体的景点、餐厅，标注大致花费
- 结合当地文化特色和季节亮点
- 如果没有明确信息，主动询问目的地、天数、预算、偏好

你代表"CJ的漫旅"品牌，我是你的专属AI旅行助手。`,
    };

    const fullMessages = [systemPrompt, ...messages];

    // ---- 4. 保存用户消息到数据库 ----
    const lastUserMsg = messages[messages.length - 1];
    if (lastUserMsg && lastUserMsg.role === "user") {
      await supabase.from("chat_history").insert({
        user_id: user.id,
        itinerary_id: itinerary_id || null,
        role: "user",
        content: lastUserMsg.content,
      }).then((r) => {
        if (r.error) console.error("Save user msg error:", r.error);
      });
    }

    // ---- 5. 调用 DeepSeek API ----
    const deepseekKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!deepseekKey) {
      return new Response(JSON.stringify({ error: "服务端未配置 AI Key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: fullMessages,
        temperature: 0.8,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("DeepSeek API error:", response.status, errText);
      return new Response(JSON.stringify({ error: "AI 服务暂时不可用，请稍后重试" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiReply = data.choices?.[0]?.message;

    // ---- 6. 保存 AI 回复到数据库 ----
    if (aiReply) {
      await supabase.from("chat_history").insert({
        user_id: user.id,
        itinerary_id: itinerary_id || null,
        role: "assistant",
        content: aiReply.content,
      }).then((r) => {
        if (r.error) console.error("Save AI reply error:", r.error);
      });
    }

    // ---- 7. 返回结果 ----
    return new Response(JSON.stringify({
      reply: aiReply?.content || "AI 未返回内容",
      model: data.model,
      usage: data.usage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Edge Function error:", err);
    return new Response(JSON.stringify({ error: "服务器内部错误" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
