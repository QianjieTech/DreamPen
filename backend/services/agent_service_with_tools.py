"""
AI Agent服务 - 支持工具调用的版本
"""
from typing import AsyncGenerator
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from backend.core.config import settings
from backend.services.tools import create_file_tools


class WorldviewAgentWithTools:
    """世界观构建Agent - 支持工具调用"""
    
    def __init__(self, user_id: str, project_id: str, custom_prompt: str | None = None):
        """
        初始化世界观Agent
        
        Args:
            user_id: 用户ID  
            project_id: 项目ID
            custom_prompt: 自定义系统提示词（可选）
        """
        self.user_id = user_id
        self.project_id = project_id
        self.custom_prompt = custom_prompt
        
        # 创建LLM（启用工具调用）
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url,
            model=settings.openai_model,
            temperature=settings.openai_temperature
        )
        
        # 创建文件操作工具
        self.tools = create_file_tools(user_id, project_id)
        
        # 将工具绑定到LLM
        self.llm_with_tools = self.llm.bind_tools(self.tools)
    
    def _get_system_prompt(self) -> str:
        """
        获取系统提示词
        
        Returns:
            系统提示词内容
        """
        # 工具使用指令（无论使用哪个提示词都要附加）
        tool_instructions = """

---
**🛠️ 文件操作工具（重要）**：

你拥有以下工具，必须在需要时立即使用：
1. **read_file(file_path)** - 读取文件
2. **write_to_file(file_path, content)** - 写入/创建文件
3. **list_files(directory)** - 列出目录
4. **create_directory(directory_path)** - 创建目录

**执行原则**：
🚨 **立即执行，不要解释** - 不要说"我将..."，直接调用工具
- 需要查看 → 直接 read_file
- 需要写入 → 直接 write_to_file
- 需要浏览 → 直接 list_files

**错误示范** ❌：
"好的，我将为您创建角色卡..." [只说不做]

**正确示范** ✅：
[立即调用 write_to_file("02_characters/xxx.md", content)]
"✅ 角色卡已创建！"

**文件路径**：
- 世界观：01_settings/worldview.md
- 角色卡：02_characters/角色名.md
- 剧情：03_story/xxx.md

先行动，后说话。用户要结果，不要承诺。
---
"""
        
        if self.custom_prompt:
            # 自定义提示词 + 工具使用指令
            return self.custom_prompt + tool_instructions
        
        # 默认提示词
        return """你是 **Worldview Architect**，一个专业的小说世界观构建专家。

你拥有以下文件操作工具，可以直接使用：

1. **read_file(file_path)** - 读取文件内容
2. **write_to_file(file_path, content)** - 写入/创建文件
3. **list_files(directory)** - 列出目录文件
4. **create_directory(directory_path)** - 创建目录

**执行原则（非常重要）**：

🚨 **立即执行，不要解释**：
- 当需要查看文件时，直接调用 read_file，不要说"我将查看"
- 当需要写入文件时，直接调用 write_to_file，不要说"我将写入"
- 当需要浏览目录时，直接调用 list_files，不要说"我将列出"
- **先行动，后说话**：先调用工具获取结果，然后基于结果给用户反馈

**错误示范** ❌：
用户："创建角色卡"
你："好的，我将为您创建角色卡..." [停止，等待用户]

**正确示范** ✅：
用户："创建角色卡"
你：[立即调用 write_to_file("02_characters/xxx.md", content)]
然后："✅ 角色卡已创建完成！..."

**工作流程**：
1. 需要了解现状 → 直接调用 list_files 或 read_file
2. 需要创建内容 → 直接调用 write_to_file
3. 看到工具执行结果后 → 向用户解释和总结

**文件路径规范**：
- 世界观：01_settings/worldview.md
- 角色卡：02_characters/角色名.md
- 剧情：03_story/xxx.md

记住：你有真实的文件操作能力！不要当个"嘴强王者"，要当个"行动派"。用户要的是结果，不是承诺。"""
    
    def set_prompt(self, prompt_content: str):
        """
        动态设置提示词
        
        Args:
            prompt_content: 新的提示词内容
        """
        self.custom_prompt = prompt_content
    
    async def chat_stream(
        self,
        user_message: str,
        conversation_history: list[BaseMessage]
    ) -> AsyncGenerator[dict, None]:
        """
        流式处理用户消息（支持工具调用）
        
        Args:
            user_message: 用户消息
            conversation_history: 对话历史
            
        Yields:
            流式响应数据块
        """
        from langchain_core.messages import ToolMessage
        
        # 构建消息列表
        messages = [
            SystemMessage(content=self._get_system_prompt()),
            *conversation_history,
            HumanMessage(content=user_message)
        ]
        
        # Agent循环：可能需要多轮工具调用
        max_iterations = 5
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            print(f"[Agent] 第 {iteration} 轮推理...")
            
            # LLM响应（可能包含工具调用）
            full_response = ""
            tool_calls = []
            
            async for chunk in self.llm_with_tools.astream(messages):
                # 处理内容
                if chunk.content:
                    content = str(chunk.content)
                    full_response += content
                    yield {
                        'type': 'content',
                        'content': content
                    }
                
                # 收集工具调用
                if hasattr(chunk, 'tool_calls') and chunk.tool_calls:
                    tool_calls.extend(chunk.tool_calls)
            
            # 如果没有工具调用，说明对话结束
            if not tool_calls:
                print(f"[Agent] 没有工具调用，对话结束")
                break
            
            # 执行工具调用
            yield {
                'type': 'status',
                'message': f'正在执行 {len(tool_calls)} 个操作...'
            }
            
            # 将AI消息添加到历史
            messages.append(AIMessage(
                content=full_response,
                tool_calls=tool_calls
            ))
            
            # 执行每个工具
            for tool_call in tool_calls:
                tool_name = tool_call['name']
                tool_args = tool_call['args']
                tool_call_id = tool_call['id']
                
                print(f"[Agent] 工具调用: {tool_name}({tool_args})")
                
                # 查找对应的工具
                tool_func = None
                for tool in self.tools:
                    if tool.name == tool_name:
                        tool_func = tool
                        break
                
                if tool_func:
                    try:
                        # 执行工具
                        result = await tool_func.ainvoke(tool_args)
                        
                        yield {
                            'type': 'tool_result',
                            'tool_name': tool_name,
                            'result': result
                        }
                        
                        # 如果是写入文件操作，额外返回文件操作信息
                        if tool_name == 'write_to_file' and '✅' in result:
                            yield {
                                'type': 'file_operation',
                                'operation': {
                                    'action': 'write',
                                    'path': tool_args.get('file_path', ''),
                                    'content': tool_args.get('content', '')
                                }
                            }
                        
                        print(f"[Agent] 工具执行成功: {result[:100]}...")
                        
                        # 将工具结果添加到消息历史
                        messages.append(ToolMessage(
                            content=result,
                            tool_call_id=tool_call_id
                        ))
                        
                    except Exception as e:
                        error_msg = f"❌ 工具执行失败: {str(e)}"
                        print(f"[Agent] {error_msg}")
                        yield {
                            'type': 'tool_result',
                            'tool_name': tool_name,
                            'result': error_msg
                        }
                        
                        # 将错误结果也添加到消息历史
                        messages.append(ToolMessage(
                            content=error_msg,
                            tool_call_id=tool_call_id
                        ))
                else:
                    error_msg = f"❌ 未找到工具: {tool_name}"
                    print(f"[Agent] {error_msg}")
                    messages.append(ToolMessage(
                        content=error_msg,
                        tool_call_id=tool_call_id
                    ))
            
            # 继续下一轮（LLM会根据工具结果生成响应）
            print(f"[Agent] 工具执行完成，继续下一轮推理...")
    
    async def chat(
        self,
        user_message: str,
        conversation_history: list[BaseMessage]
    ) -> tuple[str, list[dict]]:
        """
        处理用户消息（非流式，支持工具调用）
        
        Args:
            user_message: 用户消息
            conversation_history: 对话历史
            
        Returns:
            (AI回复, 文件操作列表)
        """
        from langchain_core.messages import ToolMessage
        
        # 构建消息列表
        messages = [
            SystemMessage(content=self._get_system_prompt()),
            *conversation_history,
            HumanMessage(content=user_message)
        ]
        
        file_operations = []
        final_reply = ""
        
        # Agent循环：可能需要多轮工具调用
        max_iterations = 5
        iteration = 0
        
        while iteration < max_iterations:
            iteration += 1
            print(f"[Agent] 第 {iteration} 轮推理...")
            
            # LLM响应（可能包含工具调用）
            response = await self.llm_with_tools.ainvoke(messages)
            ai_reply = str(response.content) if response.content else ""
            
            # 如果有内容，记录下来
            if ai_reply:
                final_reply = ai_reply
            
            # 如果没有工具调用，说明对话结束
            if not hasattr(response, 'tool_calls') or not response.tool_calls:
                print(f"[Agent] 没有工具调用，对话结束")
                break
            
            # 将AI消息添加到历史
            messages.append(AIMessage(
                content=ai_reply,
                tool_calls=response.tool_calls
            ))
            
            # 执行工具调用
            for tool_call in response.tool_calls:
                tool_name = tool_call['name']
                tool_args = tool_call['args']
                tool_call_id = tool_call['id']
                
                print(f"[Agent] 工具调用: {tool_name}({tool_args})")
                
                # 查找对应的工具
                tool_func = None
                for tool in self.tools:
                    if tool.name == tool_name:
                        tool_func = tool
                        break
                
                if tool_func:
                    try:
                        # 执行工具
                        result = await tool_func.ainvoke(tool_args)
                        print(f"[Agent] 工具执行成功: {result[:100]}...")
                        
                        # 如果是写入文件操作，记录到file_operations
                        if tool_name == 'write_to_file' and '✅' in result:
                            file_operations.append({
                                'action': 'write',
                                'path': tool_args.get('file_path', ''),
                                'content': tool_args.get('content', '')
                            })
                        
                        # 将工具结果添加到消息历史
                        messages.append(ToolMessage(
                            content=result,
                            tool_call_id=tool_call_id
                        ))
                        
                    except Exception as e:
                        error_msg = f"❌ 工具执行失败: {str(e)}"
                        print(f"[Agent] {error_msg}")
                        
                        # 将错误结果也添加到消息历史
                        messages.append(ToolMessage(
                            content=error_msg,
                            tool_call_id=tool_call_id
                        ))
                else:
                    error_msg = f"❌ 未找到工具: {tool_name}"
                    print(f"[Agent] {error_msg}")
                    messages.append(ToolMessage(
                        content=error_msg,
                        tool_call_id=tool_call_id
                    ))
            
            # 继续下一轮（LLM会根据工具结果生成响应）
            print(f"[Agent] 工具执行完成，继续下一轮推理...")
        
        return final_reply, file_operations


class AgentFactoryWithTools:
    """Agent工厂 - 工具版本"""
    
    @staticmethod
    def create_worldview_agent(
        user_id: str,
        project_id: str,
        custom_prompt: str | None = None
    ) -> WorldviewAgentWithTools:
        """
        创建世界观Agent（支持工具调用）
        
        Args:
            user_id: 用户ID
            project_id: 项目ID
            custom_prompt: 自定义系统提示词（可选）
        
        Returns:
            世界观Agent实例
        """
        return WorldviewAgentWithTools(user_id, project_id, custom_prompt)