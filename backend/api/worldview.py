"""
世界观Agent API路由
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage, AIMessage
import json
import asyncio
from backend.models.schemas import (
    WorldviewChatRequest,
    WorldviewChatResponse,
    FileResponse,
    SuccessResponse
)
from backend.services.agent_service import AgentFactory
from backend.services.agent_service_with_tools import AgentFactoryWithTools
from backend.services.file_service import FileServiceFactory

router = APIRouter(prefix="/worldview", tags=["Worldview"])


@router.post("/chat/stream")
async def chat_with_worldview_agent_stream(
    request: WorldviewChatRequest,
    user_id: str = "test-user",
    project_id: str = "test-project"
):
    """
    与世界观Agent对话（流式响应）
    
    Args:
        request: 对话请求
        user_id: 用户ID
        project_id: 项目ID
        
    Returns:
        流式响应
    """
    print(f"\n{'='*60}")
    print(f"[WorldviewAPI] 收到流式聊天请求")
    print(f"  - user_id: {user_id}")
    print(f"  - project_id: {project_id}")
    print(f"  - message: {request.message[:50]}..." if len(request.message) > 50 else f"  - message: {request.message}")
    print(f"  - 历史消息数: {len(request.conversation_history)}")
    print(f"{'='*60}\n")
    
    async def generate():
        print("[generate] 生成器函数开始执行")
        try:
            print("[generate] 进入try块")
            
            # 立即发送一个初始消息，确保连接建立
            initial_msg = json.dumps({'type': 'status', 'message': '连接已建立'}, ensure_ascii=False)
            print(f"[generate] 发送初始消息: {initial_msg}")
            yield f"data: {initial_msg}\n\n".encode('utf-8')
            print("[generate] 初始消息已发送")
            
            # 创建Agent - 使用支持工具调用的版本
            print("[generate] 开始创建Agent (with tools)...")
            custom_prompt = getattr(request, 'custom_prompt', None)
            agent = AgentFactoryWithTools.create_worldview_agent(
                user_id=user_id,
                project_id=project_id,
                custom_prompt=custom_prompt
            )
            print(f"[generate] Agent创建成功 (custom_prompt: {bool(custom_prompt)}, tools enabled)")
            
            # 转换对话历史
            conversation_history = []
            for msg in request.conversation_history:
                if msg.role == "user":
                    conversation_history.append(HumanMessage(content=msg.content))
                elif msg.role == "assistant":
                    conversation_history.append(AIMessage(content=msg.content))
            print(f"[generate] 对话历史转换完成, 共{len(conversation_history)}条消息")
            
            # 调用Agent的流式方法（工具版本不需要user_id和project_id参数）
            chunk_count = 0
            print("[generate] 开始调用agent.chat_stream (with tools)...")
            async for chunk in agent.chat_stream(
                user_message=request.message,
                conversation_history=conversation_history
            ):
                chunk_count += 1
                print(f"[generate] 收到chunk #{chunk_count}: {chunk.get('type', 'unknown')}")
                # 发送SSE格式的数据 - 使用 UTF-8 编码
                json_str = json.dumps(chunk, ensure_ascii=False)
                sse_data = f"data: {json_str}\n\n".encode('utf-8')
                yield sse_data
                await asyncio.sleep(0.01)  # 小延迟避免过快
            
            print(f"[generate] Agent流式响应完成, 共{chunk_count}个chunk")
            
            # 发送完成信号
            done_json = json.dumps({'type': 'done'}, ensure_ascii=False)
            done_signal = f"data: {done_json}\n\n".encode('utf-8')
            print("[generate] 发送完成信号")
            yield done_signal
            print("[generate] 生成器正常结束")
            
        except Exception as e:
            print(f"[generate] 捕获异常: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            error_data = {
                'type': 'error',
                'message': str(e)
            }
            error_json = json.dumps(error_data, ensure_ascii=False)
            yield f"data: {error_json}\n\n".encode('utf-8')
            print("[generate] 错误消息已发送")
    
    print("[WorldviewAPI] 准备返回StreamingResponse...")
    response = StreamingResponse(
        generate(),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用nginx缓冲
            "Transfer-Encoding": "chunked"
        }
    )
    print("[WorldviewAPI] StreamingResponse已创建，准备返回")
    return response


@router.post("/chat", response_model=WorldviewChatResponse)
async def chat_with_worldview_agent(
    request: WorldviewChatRequest,
    user_id: str = "test-user",  # TODO: 从认证中获取
    project_id: str = "test-project"  # TODO: 从请求参数获取
):
    """
    与世界观Agent对话
    
    Args:
        request: 对话请求
        user_id: 用户ID
        project_id: 项目ID
        
    Returns:
        AI回复和文件操作
    """
    try:
        # 创建Agent - 使用支持工具调用的版本
        custom_prompt = getattr(request, 'custom_prompt', None)
        agent = AgentFactoryWithTools.create_worldview_agent(
            user_id=user_id,
            project_id=project_id,
            custom_prompt=custom_prompt
        )
        
        # 转换对话历史为LangChain消息格式
        conversation_history = []
        for msg in request.conversation_history:
            if msg.role == "user":
                conversation_history.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                conversation_history.append(AIMessage(content=msg.content))
        
        # 调用Agent（工具版本不需要user_id和project_id参数）
        ai_reply, file_operations = await agent.chat(
            user_message=request.message,
            conversation_history=conversation_history
        )
        
        # 添加日志
        print(f"[Agent] 返回结果:")
        print(f"  - ai_reply长度: {len(ai_reply)}")
        print(f"  - file_operations: {file_operations}")
        
        # 不在后端执行文件操作，让前端处理
        # 这样可以给用户更好的反馈和控制
        
        return WorldviewChatResponse(
            reply=ai_reply,
            file_operations=file_operations
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/read", response_model=FileResponse)
async def read_worldview(
    user_id: str = "demo_user",
    project_id: str = "demo_project"
):
    """
    读取世界观文件
    
    Args:
        user_id: 用户ID
        project_id: 项目ID
        
    Returns:
        世界观文件内容
    """
    try:
        file_service = FileServiceFactory.create(user_id, project_id)
        content = await file_service.read_worldview()
        
        return FileResponse(
            content=content,
            path="01_settings/worldview.md"
        )
    
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="世界观文件不存在")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/write", response_model=SuccessResponse)
async def write_worldview(
    content: str,
    user_id: str = "demo_user",
    project_id: str = "demo_project"
):
    """
    直接写入世界观文件
    
    Args:
        content: 文件内容
        user_id: 用户ID
        project_id: 项目ID
        
    Returns:
        成功响应
    """
    try:
        file_service = FileServiceFactory.create(user_id, project_id)
        await file_service.write_worldview(content)
        
        return SuccessResponse(message="世界观文件已保存")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))