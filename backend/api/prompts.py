"""
提示词管理API
"""
from fastapi import APIRouter, HTTPException
from typing import List, Dict
import os

router = APIRouter(prefix="/prompts", tags=["prompts"])

PROMPTS_DIR = "prompts"


@router.get("/list")
async def list_prompts():
    """
    获取所有可用的提示词列表
    
    Returns:
        dict: 包含提示词列表的响应
    """
    try:
        if not os.path.exists(PROMPTS_DIR):
            raise HTTPException(status_code=404, detail="Prompts directory not found")
        
        # 获取所有.md文件
        files = [f for f in os.listdir(PROMPTS_DIR) if f.endswith('_prompt.md')]
        
        # 构建提示词信息列表
        prompts = []
        for filename in sorted(files):
            # 从文件名提取提示词名称
            # 例如: "worldview_agent_prompt.md" -> "worldview_agent"
            name = filename.replace('_prompt.md', '')
            
            # 生成友好的显示名称
            display_name = _generate_display_name(name)
            
            prompts.append({
                "name": name,
                "filename": filename,
                "display_name": display_name,
                "path": f"{PROMPTS_DIR}/{filename}"
            })
        
        return {
            "success": True,
            "data": prompts,
            "count": len(prompts)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing prompts: {str(e)}")


@router.get("/content/{prompt_name}")
async def get_prompt_content(prompt_name: str):
    """
    获取指定提示词的内容
    
    Args:
        prompt_name: 提示词名称（不含后缀）
        
    Returns:
        dict: 包含提示词内容的响应
    """
    try:
        # 构建文件路径
        filename = f"{prompt_name}_prompt.md"
        file_path = os.path.join(PROMPTS_DIR, filename)
        
        # 检查文件是否存在
        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=404, 
                detail=f"Prompt file not found: {filename}"
            )
        
        # 读取文件内容
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return {
            "success": True,
            "data": {
                "name": prompt_name,
                "filename": filename,
                "content": content,
                "size": len(content)
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error reading prompt: {str(e)}"
        )


def _generate_display_name(name: str) -> str:
    """
    从提示词名称生成友好的显示名称
    
    Args:
        name: 提示词名称（如 "worldview_agent"）
        
    Returns:
        str: 显示名称（如 "世界观架构师"）
    """
    # 定义名称映射
    name_mapping = {
        "worldview_agent": "世界观架构师 (Worldview Architect)",
        "character_agent": "角色塑造师 (Character Soul-crafter)",
        "outline_agent": "大纲架构师 (Outline Architect)",
        "scene_plan_agent": "场景规划师 (Scene Planner)",
        "story_writer_agent": "故事撰写师 (Story Writer)",
        "style_guide_agent": "文风指导师 (Style Guide)",
        "state_maintenance_agent": "状态维护师 (State Maintenance)"
    }
    
    return name_mapping.get(name, name.replace('_', ' ').title())