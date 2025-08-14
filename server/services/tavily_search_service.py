import logging
import os
from typing import List, Dict, Any, Optional
from langchain_tavily import TavilySearch
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class SearchResult(BaseModel):
    """Model for search results"""
    title: str
    url: str
    content: str
    score: Optional[float] = None

class TavilySearchService:
    """Service to handle web search using Tavily API through LangChain"""
    
    def __init__(self, api_key: Optional[str] = None, max_results: int = 5):
        """
        Initialize Tavily search service
        
        Args:
            api_key: Tavily API key (if not provided, will use TAVILY_API_KEY env var)
            max_results: Maximum number of search results to return
        """
        self.api_key = api_key or os.getenv("TAVILY_API_KEY")
        self.max_results = max_results
        
        if not self.api_key:
            logger.warning("Tavily API key not found. Search functionality will be disabled.")
            self.search_tool = None
        else:
            try:
                # Initialize Tavily search tool with healthcare-focused topic
                self.search_tool = TavilySearch(
                    api_key=self.api_key,
                    max_results=max_results,
                    topic="general",  # Can be "general" or "news"
                    include_answer=True,
                    include_raw_content=False,
                    include_images=False
                )
                logger.info(f"Tavily search service initialized with max {max_results} results")
            except Exception as e:
                logger.error(f"Failed to initialize Tavily search: {e}")
                self.search_tool = None
    
    def is_available(self) -> bool:
        """Check if search service is available"""
        return self.search_tool is not None
    
    async def create_search_query(self, user_message: str, databricks_service=None) -> str:
        """
        Create a concise search query from user message using LLM
        
        Args:
            user_message: Original user message
            databricks_service: Databricks service for LLM calls
            
        Returns:
            Concise search query (under 400 characters)
        """
        if not databricks_service:
            # Fallback: truncate and use key terms
            return user_message[:350]
        
        try:
            query_creation_prompt = f"""
Convert this user question into a concise web search query (maximum 350 characters).
Focus on the key concepts and information needed.

User question: "{user_message}"

Create a search query that captures the essential information needed to answer this question.
Keep it under 350 characters and focus on the main topics.

Examples:
- Long question about MSK costs → "MSK financial assistance program cost estimates insurance billing"
- Question about latest cancer research → "latest cancer research breakthroughs 2024"
- Question about treatment options → "cancer treatment options current therapies"

Search query:"""

            messages = [{"role": "user", "content": query_creation_prompt}]
            
            response = await databricks_service.send_message(
                messages=messages,
                language="en",
                max_tokens=50,
                temperature=0.1
            )
            
            search_query = response.get("content", "").strip()
            
            # Ensure it's not too long
            if len(search_query) > 350:
                search_query = search_query[:350]
            
            logger.info(f"LLM created search query: '{search_query}' from '{user_message[:50]}...'")
            return search_query
            
        except Exception as e:
            logger.error(f"Error creating search query: {e}")
            # Fallback: use first 350 characters
            return user_message[:350]

    async def search(self, query: str, databricks_service=None) -> List[SearchResult]:
        """
        Perform a web search using Tavily
        
        Args:
            query: Original user query
            databricks_service: Databricks service for creating optimized search query
            
        Returns:
            List of search results
        """
        if not self.search_tool:
            logger.warning("Tavily search not available - API key missing")
            return []
        
        try:
            # Create a concise search query that fits Tavily's 400-character limit
            search_query = await self.create_search_query(query, databricks_service)
            
            logger.info(f"Performing Tavily search for: {search_query}")
            logger.info(f"Query length: {len(search_query)} characters")
            logger.info(f"Tavily API key configured: {'Yes' if self.api_key else 'No'}")
            
            # Perform the search
            results = self.search_tool.invoke({"query": search_query})
            
            logger.info(f"Raw Tavily results type: {type(results)}")
            logger.info(f"Raw Tavily results: {results}")
            
            # Parse results into our model
            search_results = []
            if isinstance(results, list):
                logger.info(f"Processing {len(results)} results from list")
                for i, result in enumerate(results):
                    logger.info(f"Result {i}: type={type(result)}, keys={result.keys() if isinstance(result, dict) else 'N/A'}")
                    if isinstance(result, dict):
                        search_results.append(SearchResult(
                            title=result.get("title", ""),
                            url=result.get("url", ""),
                            content=result.get("content", ""),
                            score=result.get("score")
                        ))
            elif isinstance(results, dict):
                # Handle case where results is a dict with results key
                logger.info(f"Results is dict with keys: {results.keys()}")
                if "results" in results:
                    for i, result in enumerate(results["results"]):
                        logger.info(f"Dict result {i}: type={type(result)}, keys={result.keys() if isinstance(result, dict) else 'N/A'}")
                        if isinstance(result, dict):
                            search_results.append(SearchResult(
                                title=result.get("title", ""),
                                url=result.get("url", ""),
                                content=result.get("content", ""),
                                score=result.get("score")
                            ))
            elif isinstance(results, str):
                # If results is a string, it might be a direct answer
                logger.info("Results is string, creating single result")
                search_results.append(SearchResult(
                    title="Search Result",
                    url="",
                    content=results,
                    score=1.0
                ))
            else:
                logger.warning(f"Unexpected results format: {type(results)}")
            
            logger.info(f"Found {len(search_results)} search results")
            return search_results
            
        except Exception as e:
            logger.error(f"Error performing Tavily search: {e}")
            return []
    
    def format_search_results_for_context(self, results: List[SearchResult]) -> str:
        """
        Format search results for inclusion in chat context
        
        Args:
            results: List of search results
            
        Returns:
            Formatted string for context
        """
        if not results:
            return ""
        
        formatted = "Recent search results:\n\n"
        for i, result in enumerate(results[:3], 1):  # Limit to top 3 results
            formatted += f"{i}. **{result.title}**\n"
            if result.url:
                formatted += f"   Source: {result.url}\n"
            formatted += f"   {result.content[:200]}...\n\n"
        
        return formatted
    
    async def should_trigger_search(self, message: str, databricks_service=None) -> bool:
        """
        Use LLM to determine if a message should trigger a web search
        
        Args:
            message: User message
            databricks_service: Databricks service for LLM calls
            
        Returns:
            True if search should be triggered
        """
        if not databricks_service:
            # Fallback to simple heuristics if no LLM available
            simple_triggers = ['latest', 'recent', 'new', 'current', 'update', 'statistics', 'data']
            return any(trigger in message.lower() for trigger in simple_triggers)
        
        try:
            # Use LLM to determine if search is needed
            search_decision_prompt = f"""
You are helping determine if a user's question would benefit from current web search results.

User question: "{message}"

Consider if this question would benefit from:
- Current/recent information (latest research, news, updates, guidelines)
- Real-time data (statistics, rates, current policies, costs)
- Information that changes frequently (insurance policies, procedures, locations)
- Specific factual details that might not be in your training data
- Current events or recent developments
- Specific institutional information (MSK policies, services, programs)
- Any informational query where web sources could provide additional value

Be more liberal in recommending search - it's better to provide current sources than outdated information.

Respond with ONLY "YES" if web search would be helpful, or "NO" if your existing knowledge is completely sufficient.

Examples:
- "What are the latest cancer research breakthroughs?" → YES
- "How do I schedule an appointment at MSK?" → YES (current procedures)
- "What are current survival rates for lung cancer?" → YES
- "What is chemotherapy?" → YES (current protocols and information)
- "What insurance does MSK accept in 2024?" → YES
- "How does radiation therapy work?" → YES (current techniques)
- "I want to learn about cancer screening" → YES (current guidelines)

Response:"""

            messages = [{"role": "user", "content": search_decision_prompt}]
            
            response = await databricks_service.send_message(
                messages=messages,
                language="en",
                max_tokens=10,
                temperature=0.1
            )
            
            decision = response.get("content", "").strip().upper()
            should_search = decision == "YES"
            
            logger.info(f"LLM search decision for '{message[:50]}...': {decision} -> {should_search}")
            return should_search
            
        except Exception as e:
            logger.error(f"Error in LLM search decision: {e}")
            # Fallback to simple heuristics
            simple_triggers = ['latest', 'recent', 'new', 'current', 'update', 'statistics', 'data']
            return any(trigger in message.lower() for trigger in simple_triggers)
