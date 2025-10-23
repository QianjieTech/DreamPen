"""
应用配置管理
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import SecretStr
from pathlib import Path


class Settings(BaseSettings):
    """应用配置"""
    
    # 应用基础配置
    app_name: str = "DreamPen"
    app_version: str = "0.1.0"
    debug: bool = True
    
    # API配置
    api_prefix: str = "/api"
    
    # OpenAI配置
    openai_api_key: SecretStr = SecretStr("")
    openai_base_url: str = "https://api.openai.com/v1"  # 可自定义为其他兼容端点
    openai_model: str = "gpt-4"
    openai_temperature: float = 0.7
    
    # 文件存储配置
    git_repos_base_path: Path = Path("git_repos")
    
    # 数据库配置
    database_url: str = "sqlite+aiosqlite:///./dreampen.db"
    
    # JWT配置
    secret_key: str = "your-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )


# 全局配置实例
settings = Settings()