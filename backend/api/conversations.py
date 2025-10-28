"""
对话管理 API路由
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
import json
from datetime import datetime

from backend.models.database import Conversation, User
from backend.models.schemas import (
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
    Message
)
from backend.core.database import get_db
from backend.core.dependencies import get_current_user

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.post("", response_model=ConversationResponse)
async def create_conversation(
    request: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    创建新对话
    
    Args:
        request: 创建对话请求
        current_user: 当前用户
        db: 数据库会话
        
    Returns:
        创建的对话信息
    """
    try:
        # 将消息列表转换为JSON字符串
        messages_json = json.dumps([msg.dict() for msg in request.messages], ensure_ascii=False)
        
        # 创建对话记录
        conversation = Conversation(
            user_id=current_user.id,
            project_id=request.project_id,
            title=request.title,
            messages=messages_json,
            is_collapsed=False
        )
        
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        
        # 转换为响应格式
        return ConversationResponse(
            id=conversation.id,
            user_id=conversation.user_id,
            project_id=conversation.project_id,
            title=conversation.title,
            messages=[Message(**msg) for msg in json.loads(conversation.messages)],
            is_collapsed=conversation.is_collapsed,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at
        )
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"创建对话失败: {str(e)}")


@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取用户在指定项目下的所有对话
    
    Args:
        project_id: 项目ID
        current_user: 当前用户
        db: 数据库会话
        
    Returns:
        对话列表
    """
    try:
        # 查询对话
        result = await db.execute(
            select(Conversation)
            .where(
                and_(
                    Conversation.user_id == current_user.id,
                    Conversation.project_id == project_id
                )
            )
            .order_by(Conversation.updated_at.desc())
        )
        conversations = result.scalars().all()
        
        # 转换为响应格式
        return [
            ConversationResponse(
                id=conv.id,
                user_id=conv.user_id,
                project_id=conv.project_id,
                title=conv.title,
                messages=[Message(**msg) for msg in json.loads(conv.messages)],
                is_collapsed=conv.is_collapsed,
                created_at=conv.created_at,
                updated_at=conv.updated_at
            )
            for conv in conversations
        ]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取对话列表失败: {str(e)}")


@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取指定对话的详细信息(支持分页)
    
    Args:
        conversation_id: 对话ID
        limit: 每页消息数量(默认50)
        offset: 偏移量(默认0)
        current_user: 当前用户
        db: 数据库会话
        
    Returns:
        对话详情
    """
    try:
        # 查询对话
        result = await db.execute(
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == current_user.id
                )
            )
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="对话不存在")
        
        # 解析消息并分页
        all_messages = json.loads(conversation.messages)
        paginated_messages = all_messages[offset:offset + limit] if limit > 0 else all_messages
        
        # 转换为响应格式
        return ConversationResponse(
            id=conversation.id,
            user_id=conversation.user_id,
            project_id=conversation.project_id,
            title=conversation.title,
            messages=[Message(**msg) for msg in paginated_messages],
            is_collapsed=conversation.is_collapsed,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取对话失败: {str(e)}")


@router.put("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: int,
    request: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    更新对话信息
    
    Args:
        conversation_id: 对话ID
        request: 更新请求
        current_user: 当前用户
        db: 数据库会话
        
    Returns:
        更新后的对话信息
    """
    try:
        # 查询对话
        result = await db.execute(
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == current_user.id
                )
            )
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="对话不存在")
        
        # 更新字段
        if request.title is not None:
            conversation.title = request.title
        if request.messages is not None:
            conversation.messages = json.dumps([msg.dict() for msg in request.messages], ensure_ascii=False)
        if request.is_collapsed is not None:
            conversation.is_collapsed = request.is_collapsed
        
        await db.commit()
        await db.refresh(conversation)
        
        # 转换为响应格式
        return ConversationResponse(
            id=conversation.id,
            user_id=conversation.user_id,
            project_id=conversation.project_id,
            title=conversation.title,
            messages=[Message(**msg) for msg in json.loads(conversation.messages)],
            is_collapsed=conversation.is_collapsed,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"更新对话失败: {str(e)}")


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def add_message(
    conversation_id: int,
    request: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    向对话添加新消息
    
    Args:
        conversation_id: 对话ID
        request: 消息创建请求
        current_user: 当前用户
        db: 数据库会话
        
    Returns:
        添加的消息信息
    """
    try:
        # 查询对话
        result = await db.execute(
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == current_user.id
                )
            )
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="对话不存在")
        
        # 解析现有消息
        messages = json.loads(conversation.messages)
        
        # 添加新消息
        messages.append(request.message.dict())
        
        # 保存更新后的消息列表
        conversation.messages = json.dumps(messages, ensure_ascii=False)
        
        await db.commit()
        
        return MessageResponse(
            conversation_id=conversation.id,
            message=request.message
        )
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"添加消息失败: {str(e)}")


@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    删除对话
    
    Args:
        conversation_id: 对话ID
        current_user: 当前用户
        db: 数据库会话
        
    Returns:
        成功消息
    """
    try:
        # 查询对话
        result = await db.execute(
            select(Conversation)
            .where(
                and_(
                    Conversation.id == conversation_id,
                    Conversation.user_id == current_user.id
                )
            )
        )
        conversation = result.scalar_one_or_none()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="对话不存在")
        
        # 删除对话
        await db.delete(conversation)
        await db.commit()
        
        return {"message": "对话已删除"}
    
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"删除对话失败: {str(e)}")