"""
数据库模型定义
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()


class User(Base):
    """用户模型"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"


class Project(Base):
    """项目模型 - 存储用户的书籍项目"""
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String(100), nullable=False, unique=True, index=True)  # 项目唯一标识
    name = Column(String(200), nullable=False)  # 项目名称
    description = Column(Text, nullable=True)  # 项目描述
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Project(id={self.id}, user_id={self.user_id}, project_id='{self.project_id}', name='{self.name}')>"


class Conversation(Base):
    """对话模型 - 存储AI助手对话历史"""
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    project_id = Column(String(100), nullable=False, index=True)
    title = Column(String(200), nullable=True)  # 对话标题(可从首条消息生成)
    messages = Column(Text, nullable=False)  # JSON格式存储消息列表
    is_collapsed = Column(Boolean, default=False, nullable=False)  # 是否折叠
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    
    def __repr__(self):
        return f"<Conversation(id={self.id}, user_id={self.user_id}, project_id='{self.project_id}', title='{self.title}')>"