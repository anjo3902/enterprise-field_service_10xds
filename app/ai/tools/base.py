from typing import Any, Dict, Callable
from pydantic import BaseModel

class Tool(BaseModel):
    name: str
    description: str
    func: Callable
    
    def execute(self, *args, **kwargs) -> Any:
        return self.func(*args, **kwargs)
