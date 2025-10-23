"""
AI Agent服务 - 基于LangGraph的创作Agent
"""
from typing import TypedDict, Annotated, Sequence, Literal
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from backend.core.config import settings
from backend.services.file_service import FileService


# ========== 状态定义 ==========

class AgentState(TypedDict):
    """Agent状态"""
    messages: Annotated[Sequence[BaseMessage], "对话历史"]
    user_id: str
    project_id: str
    current_task: str  # worldview, outline, character, chapter等
    context: dict  # 任务相关的上下文信息
    file_operations: list  # 待执行的文件操作
    next_action: str  # 下一步动作


# ========== 世界观Agent ==========

class WorldviewAgent:
    """世界观构建Agent"""
    
    # 从提示词文件提取的系统提示
    SYSTEM_PROMPT = """你是 **Worldview Architect**,一个专业的小说世界观构建专家。你的核心理念是通过扎实的基础设定,让故事世界自然运转。

核心职责:
1. 引导式探索:帮助作者从零散灵感出发,逐步构建完整世界观
2. 智能维度选择:根据核心创意和小说类型,动态选择重点构建的维度
3. 逻辑自洽检查:确保所有设定之间不存在矛盾
4. 原创性保护:引导作者提取参考作品的结构特征,而非直接复制内容

核心原则:
- 渐进式对话节奏:每次只聚焦一个维度,等待用户充分回答
- 半自动辅助:提供选项让用户选择,而非完全开放式提问
- 一问一答节奏:不要在单个回复中堆砌大量信息

工作流程:
1. 收集核心种子(用户的初始灵感)
2. 完善基础维度(世界类型、物理法则、种族概览)
3. 选定关键维度(6-12个)
4. 补充必要维度(确保总数≥16个)
5. 逻辑自洽检查
6. 生成世界观文档

基础维度(必填3个):
1. 世界类型与核心概念
2. 物理法则/世界规则
3. 种族/物种概览

维度池(Agent智能选择):
- 地理空间结构
- 时间与历史背景
- 能量/魔法体系
- 修炼/进阶路径
- 主要势力与组织
- 社会结构与阶层
- 政治体系
- 经济体系
- 科技发展水平
- 文化与习俗
- 宗教/信仰体系
- 法宝/装备体系
- 特殊规则/禁忌
等等...

对话风格:
- 专业但友好
- 简洁明确
- 一次只问一个主要问题
- 关键设定点需要复述确认

当用户表示完成收集信息后,你需要生成完整的世界观Markdown文档。文档应该结构清晰,包含所有已确认的维度设定。"""
    
    def __init__(self, llm: ChatOpenAI):
        """
        初始化世界观Agent
        
        Args:
            llm: OpenAI语言模型
        """
        self.llm = llm
    
    async def chat_stream(
        self,
        user_message: str,
        conversation_history: list[BaseMessage],
        user_id: str,
        project_id: str
    ):
        """
        流式处理用户消息
        
        Args:
            user_message: 用户消息
            conversation_history: 对话历史
            user_id: 用户ID
            project_id: 项目ID
            
        Yields:
            流式响应数据块
        """
        # 构建消息列表
        messages = [
            SystemMessage(content=self.SYSTEM_PROMPT),
            *conversation_history,
            HumanMessage(content=user_message)
        ]
        
        # 检测是否需要生成文档
        # 方法1: 关键词检测（用户明确要求）
        keywords = ["生成文档", "生成世界观", "完成构建", "创建文件", "写入文件", "生成初步文档",  "跳过设计", "直接生成"]
        user_message_lower = user_message.lower()
        keyword_found = any(keyword in user_message_lower for keyword in keywords)
        
        # 方法2: 智能检测 - 检查对话历史是否已收集完整世界观信息
        should_auto_generate = await self._should_auto_generate_document(
            conversation_history + [HumanMessage(content=user_message)]
        )
        
        # 如果关键词检测或智能检测满足，则生成文档
        needs_document = keyword_found or should_auto_generate
        
        print(f"🔵 流式处理 - 关键词检测: {keyword_found}, 智能检测: {should_auto_generate}, 需要生成: {needs_document}")
        
        # 流式调用LLM
        full_response = ""
        async for chunk in self.llm.astream(messages):
            if chunk.content:
                content = str(chunk.content)
                full_response += content
                yield {
                    'type': 'content',
                    'content': content
                }
        
        # 如果需要生成文档
        if keyword_found:
            yield {
                'type': 'status',
                'message': '正在生成世界观文档...'
            }
            
            print(f"🔵 开始生成世界观文档...")
            
            # 生成文档（也使用流式）
            worldview_content = ""
            async for doc_chunk in self._generate_worldview_document_stream(
                conversation_history + [HumanMessage(content=user_message)],
                user_id,
                project_id
            ):
                worldview_content += doc_chunk
                yield {
                    'type': 'document',
                    'content': doc_chunk
                }
            
            print(f"🔵 文档生成完成，长度: {len(worldview_content)}")
            
            # 返回文件操作
            yield {
                'type': 'file_operation',
                'operation': {
                    "action": "write",
                    "path": "01_settings/worldview.md",
                    "content": worldview_content
                }
            }
    
    async def chat(
        self,
        user_message: str,
        conversation_history: list[BaseMessage],
        user_id: str,
        project_id: str
    ) -> tuple[str, list[dict]]:
        """
        处理用户消息（非流式）
        
        Args:
            user_message: 用户消息
            conversation_history: 对话历史
            user_id: 用户ID
            project_id: 项目ID
            
        Returns:
            (AI回复, 文件操作列表)
        """
        # 构建消息列表
        messages = [
            SystemMessage(content=self.SYSTEM_PROMPT),
            *conversation_history,
            HumanMessage(content=user_message)
        ]
        
        # 调用LLM
        response = await self.llm.ainvoke(messages)
        ai_reply = str(response.content) if response.content else ""
        
        # 检测是否需要生成文档
        file_operations = []
        keywords = ["生成文档", "生成世界观", "完成构建", "创建文件", "写入文件", "生成初步文档", "跳过设计", "直接生成"]
        
        user_message_lower = user_message.lower()
        keyword_found = any(keyword in user_message_lower for keyword in keywords)
        
        print(f"🔵 关键词检测:")
        print(f"  - 用户消息: {user_message}")
        print(f"  - 小写消息: {user_message_lower}")
        print(f"  - 检测到关键词: {keyword_found}")
        
        if keyword_found:
            print(f"🔵 开始生成世界观文档...")
            # 用户请求生成文档,需要根据对话历史生成世界观内容
            worldview_content = await self._generate_worldview_document(
                conversation_history + [HumanMessage(content=user_message)],
                user_id,
                project_id
            )
            
            print(f"🔵 文档生成完成，长度: {len(worldview_content)}")
            
            file_operations.append({
                "action": "write",
                "path": "01_settings/worldview.md",
                "content": worldview_content
            })
            
            print(f"🔵 file_operations: {[op['action'] + ': ' + op['path'] for op in file_operations]}")
        else:
            print(f"❌ 未检测到关键词，不生成文档")
        
        return ai_reply, file_operations
    
    async def _should_auto_generate_document(
        self,
        conversation_history: list[BaseMessage]
    ) -> bool:
        """
        智能检测是否应该自动生成世界观文档
        
        通过分析对话历史，判断用户是否已经完成了世界观的核心维度讨论
        
        Args:
            conversation_history: 完整对话历史
            
        Returns:
            是否应该自动生成文档
        """
        # 如果对话太短，不自动生成
        if len(conversation_history) < 10:
            return False
        
        # 检查最近的对话是否包含完整的世界观描述
        # 查看最后一条AI回复是否很长且包含世界观相关内容
        if len(conversation_history) > 0:
            last_message = conversation_history[-1]
            if isinstance(last_message, AIMessage):
                content = str(last_message.content)
                
                # 检查内容长度（完整世界观通常很长）
                if len(content) < 1500:
                    return False
                
                # 检查是否包含多个核心维度的标志
                dimension_indicators = [
                    "世界类型", "物理法则", "种族", "地理", "历史",
                    "魔法", "科技", "势力", "社会", "经济", "文化",
                    "核心概念", "世界观", "设定", "背景", "主线"
                ]
                
                content_lower = content.lower()
                matched_dimensions = sum(1 for indicator in dimension_indicators if indicator in content_lower)
                
                # 如果匹配了5个以上的维度标志，认为是完整世界观
                if matched_dimensions >= 8:
                    print(f"🟢 智能检测: 发现完整世界观描述 (匹配维度: {matched_dimensions}/16)")
                    return True
        
        return False
    
    async def _generate_worldview_document_stream(
        self,
        conversation_history: list[BaseMessage],
        user_id: str,
        project_id: str
    ):
        """
        流式生成世界观文档
        
        Args:
            conversation_history: 对话历史
            user_id: 用户ID
            project_id: 项目ID
            
        Yields:
            文档内容块
        """
        summary_prompt = """请基于之前的对话,生成一份完整的世界观设定文档。

文档格式要求:
1. 使用Markdown格式
2. 包含清晰的标题层级
3. 按照维度分类组织内容
4. 确保所有用户确认的设定都被包含

文档结构参考:
# [世界名称] 世界观设定

## 核心概念
[用一句话概括世界的独特性]

## 基础维度

### 1. 世界类型
[详细描述]

### 2. 物理法则/世界规则
[详细描述]

### 3. 种族/物种
[详细描述]

## 关键维度

### [维度名称]
[详细描述]

...

## 补充维度

### [维度名称]
[简要描述]

...

请根据对话内容生成完整的文档内容。"""
        
        messages = conversation_history + [
            HumanMessage(content=summary_prompt)
        ]
        
        # 流式生成
        async for chunk in self.llm.astream(messages):
            if chunk.content:
                yield str(chunk.content)
    
    async def _generate_worldview_document(
        self,
        conversation_history: list[BaseMessage],
        user_id: str,
        project_id: str
    ) -> str:
        """
        根据对话历史生成世界观文档（非流式）
        
        Args:
            conversation_history: 对话历史
            user_id: 用户ID
            project_id: 项目ID
            
        Returns:
            世界观文档内容
        """
        # 提取对话中的关键信息
        summary_prompt = """请基于之前的对话,生成一份完整的世界观设定文档。

文档格式要求:
1. 使用Markdown格式
2. 包含清晰的标题层级
3. 按照维度分类组织内容
4. 确保所有用户确认的设定都被包含

文档结构参考:
# [世界名称] 世界观设定

## 核心概念
[用一句话概括世界的独特性]

## 基础维度

### 1. 世界类型
[详细描述]

### 2. 物理法则/世界规则
[详细描述]

### 3. 种族/物种
[详细描述]

## 关键维度

### [维度名称]
[详细描述]

...

## 补充维度

### [维度名称]
[简要描述]

...

请根据对话内容生成完整的文档内容。"""
        
        messages = conversation_history + [
            HumanMessage(content=summary_prompt)
        ]
        
        response = await self.llm.ainvoke(messages)
        return str(response.content) if response.content else ""


# ========== Agent工作流(预留) ==========

class CreativeAgentWorkflow:
    """
    创作Agent工作流 - 基于LangGraph
    
    这是一个预留的工作流框架,用于未来扩展多Agent协作
    目前仅实现了世界观Agent的简化版本
    """
    
    def __init__(self, llm: ChatOpenAI):
        """
        初始化工作流
        
        Args:
            llm: OpenAI语言模型
        """
        self.llm = llm
        self.worldview_agent = WorldviewAgent(llm)
        # TODO: 添加其他Agent
        # self.character_agent = CharacterAgent(llm)
        # self.outline_agent = OutlineAgent(llm)
        # etc.
    
    def _build_graph(self):
        """
        构建LangGraph工作流图
        
        Returns:
            编译后的图
        """
        workflow = StateGraph(AgentState)
        
        # 添加节点
        workflow.add_node("router", self._route_task)
        workflow.add_node("worldview", self._handle_worldview)
        workflow.add_node("file_ops", self._execute_file_operations)
        workflow.add_node("summarize", self._summarize_result)
        
        # 设置入口点
        workflow.set_entry_point("router")
        
        # 添加条件边
        workflow.add_conditional_edges(
            "router",
            self._determine_agent_type,
            {
                "worldview": "worldview",
                "continue": "summarize"
            }
        )
        
        # 添加固定边
        workflow.add_edge("worldview", "file_ops")
        workflow.add_edge("file_ops", "summarize")
        workflow.add_edge("summarize", END)
        
        return workflow.compile()
    
    def _determine_agent_type(self, state: AgentState) -> Literal["worldview", "continue"]:
        """确定Agent类型"""
        # 简化版本:直接返回worldview
        return "worldview"
    
    def _route_task(self, state: AgentState) -> AgentState:
        """路由任务"""
        state["current_task"] = "worldview"
        return state
    
    def _handle_worldview(self, state: AgentState) -> AgentState:
        """处理世界观任务"""
        # 这里是占位实现,实际使用时需要异步处理
        return state
    
    def _execute_file_operations(self, state: AgentState) -> AgentState:
        """执行文件操作"""
        state["next_action"] = "write_file"
        return state
    
    def _summarize_result(self, state: AgentState) -> AgentState:
        """总结结果"""
        state["next_action"] = "complete"
        return state


# ========== Agent工厂 ==========

class AgentFactory:
    """Agent工厂"""
    
    @staticmethod
    def create_worldview_agent() -> WorldviewAgent:
        """
        创建世界观Agent
        
        Returns:
            世界观Agent实例
        """
        llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_model,
            temperature=settings.openai_temperature
        )
        return WorldviewAgent(llm)
    
    @staticmethod
    def create_workflow() -> CreativeAgentWorkflow:
        """
        创建完整工作流
        
        Returns:
            工作流实例
        """
        llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_model,
            temperature=settings.openai_temperature
        )
        return CreativeAgentWorkflow(llm)