"""
版本控制API路由
"""
from fastapi import APIRouter, HTTPException, Depends
from backend.models.database import User
from backend.core.dependencies import get_current_user
from backend.services.git_service import GitServiceFactory
from backend.services.file_service import FileServiceFactory
from typing import List, Dict

router = APIRouter(prefix="/projects", tags=["Version Control"])


@router.get("/{project_id}/commits", response_model=List[Dict])
async def get_commit_history(
    project_id: str,
    max_count: int = 50,
    file_path: str = None,
    current_user: User = Depends(get_current_user)
):
    """
    获取项目的提交历史
    
    Args:
        project_id: 项目ID
        max_count: 最大返回数量
        file_path: 特定文件的历史(可选)
        current_user: 当前登录用户
        
    Returns:
        提交历史列表
    """
    try:
        file_service = FileServiceFactory.create(str(current_user.username), project_id)
        
        if not file_service.project_exists():
            raise HTTPException(status_code=404, detail="项目不存在")
        
        git_service = GitServiceFactory.create(file_service.project_path)
        commits = git_service.get_commit_history(max_count=max_count, file_path=file_path)
        
        return commits
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/commit", response_model=dict)
async def manual_commit(
    project_id: str,
    request: dict,
    current_user: User = Depends(get_current_user)
):
    """
    手动提交更改
    
    Args:
        project_id: 项目ID
        request: 包含 message 的请求体
        current_user: 当前登录用户
        
    Returns:
        提交信息
    """
    try:
        message = request.get("message", "Manual commit")
        
        file_service = FileServiceFactory.create(str(current_user.username), project_id)
        
        if not file_service.project_exists():
            raise HTTPException(status_code=404, detail="项目不存在")
        
        git_service = GitServiceFactory.create(file_service.project_path)
        commit_sha = git_service.commit_changes(
            message=message,
            author_name=str(current_user.username),
            author_email=str(current_user.email)
        )
        
        if not commit_sha:
            return {"message": "没有需要提交的更改", "sha": None}
        
        return {
            "message": "提交成功",
            "sha": commit_sha,
            "short_sha": commit_sha[:8]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/commits/{commit_sha}/diff", response_model=dict)
async def get_commit_diff(
    project_id: str,
    commit_sha: str,
    current_user: User = Depends(get_current_user)
):
    """
    获取提交的变更内容
    
    Args:
        project_id: 项目ID
        commit_sha: 提交SHA值
        current_user: 当前登录用户
        
    Returns:
        diff内容
    """
    try:
        file_service = FileServiceFactory.create(str(current_user.username), project_id)
        
        if not file_service.project_exists():
            raise HTTPException(status_code=404, detail="项目不存在")
        
        git_service = GitServiceFactory.create(file_service.project_path)
        diff = git_service.get_commit_diff(commit_sha)
        
        return {"diff": diff, "commit_sha": commit_sha}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{project_id}/revert/{commit_sha}", response_model=dict)
async def revert_to_commit(
    project_id: str,
    commit_sha: str,
    current_user: User = Depends(get_current_user)
):
    """
    回滚到特定提交
    
    Args:
        project_id: 项目ID
        commit_sha: 目标提交的SHA值
        current_user: 当前登录用户
        
    Returns:
        成功响应
    """
    try:
        file_service = FileServiceFactory.create(str(current_user.username), project_id)
        
        if not file_service.project_exists():
            raise HTTPException(status_code=404, detail="项目不存在")
        
        git_service = GitServiceFactory.create(file_service.project_path)
        git_service.revert_to_commit(commit_sha)
        
        return {
            "message": "回滚成功",
            "commit_sha": commit_sha,
            "short_sha": commit_sha[:8]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/status", response_model=dict)
async def get_repository_status(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    获取仓库状态
    
    Args:
        project_id: 项目ID
        current_user: 当前登录用户
        
    Returns:
        仓库状态信息
    """
    try:
        file_service = FileServiceFactory.create(str(current_user.username), project_id)
        
        if not file_service.project_exists():
            raise HTTPException(status_code=404, detail="项目不存在")
        
        git_service = GitServiceFactory.create(file_service.project_path)
        status = git_service.get_status()
        
        return status
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/files/{file_path:path}/history", response_model=List[Dict])
async def get_file_history(
    project_id: str,
    file_path: str,
    max_count: int = 20,
    current_user: User = Depends(get_current_user)
):
    """
    获取特定文件的提交历史
    
    Args:
        project_id: 项目ID
        file_path: 文件路径
        max_count: 最大返回数量
        current_user: 当前登录用户
        
    Returns:
        文件的提交历史
    """
    try:
        file_service = FileServiceFactory.create(str(current_user.username), project_id)
        
        if not file_service.project_exists():
            raise HTTPException(status_code=404, detail="项目不存在")
        
        git_service = GitServiceFactory.create(file_service.project_path)
        commits = git_service.get_commit_history(max_count=max_count, file_path=file_path)
        
        return commits
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))