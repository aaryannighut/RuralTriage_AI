from pydantic import BaseModel

class MedicineResponse(BaseModel):
    id: int
    name: str
    type: str  # Maps to 'form'
    use: str   # Maps to 'category'
    availability: bool
    price: int

    class Config:
        orm_mode = True
