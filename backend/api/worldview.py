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
    async def generate():
        try:
            # 创建Agent
            agent = AgentFactory.create_worldview_agent()
            
            # 转换对话历史
            conversation_history = []
            for msg in request.conversation_history:
                if msg.role == "user":
                    conversation_history.append(HumanMessage(content=msg.content))
                elif msg.role == "assistant":
                    conversation_history.append(AIMessage(content=msg.content))
            
            # 调用Agent的流式方法
            async for chunk in agent.chat_stream(
                user_message=request.message,
                conversation_history=conversation_history,
                user_id=user_id,
                project_id=project_id
            ):
                # 发送SSE格式的数据
                yield f"data: {json.dumps(chunk, ensure_ascii=False)}\n\n"
                await asyncio.sleep(0.01)  # 小延迟避免过快
            
            # 发送完成信号
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
            
        except Exception as e:
            error_data = {
                'type': 'error',
                'message': str(e)
            }
            yield f"data: {json.dumps(error_data, ensure_ascii=False)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # 禁用nginx缓冲
        }
    )


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
        # 创建Agent
        agent = AgentFactory.create_worldview_agent()
        
        # 转换对话历史为LangChain消息格式
        conversation_history = []
        for msg in request.conversation_history:
            if msg.role == "user":
                conversation_history.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                conversation_history.append(AIMessage(content=msg.content))
        
        # 调用Agent
        ai_reply, file_operations = await agent.chat(
            user_message=request.message,
            conversation_history=conversation_history,
            user_id=user_id,
            project_id=project_id
        )
        
        # 添加日志
        print(f"🔵 Agent返回:")
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