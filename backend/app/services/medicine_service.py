from sqlalchemy.orm import Session
from app.models import Medicine
from app.schemas.medicine_schema import MedicineResponse

def search_medicines(db: Session, query: str):
    if not query or query.strip() == "":
        return []
    
    search_term = f"%{query}%"
    results = db.query(Medicine).filter(Medicine.name.ilike(search_term)).all()
    
    response = []
    for m in results:
        response.append(MedicineResponse(
            id=m.id,
            name=m.name,
            type=m.form if m.form else "Tablet",
            use=m.category if m.category else "Medical Use",
            availability=(m.stock > 0),
            price=int(m.price) if m.price else 0
        ))
        
    # If no results from database, implement the fallback mock database logic as requested
    if not results:
        q_lower = query.lower()
        mock_dataset = [
            MedicineResponse(id=1, name="Paracetamol", type="Tablet", use="Fever and pain relief", availability=True, price=20),
            MedicineResponse(id=2, name="Ibuprofen", type="Tablet", use="Pain and inflammation", availability=True, price=35),
            MedicineResponse(id=3, name="Azithromycin", type="Tablet", use="Bacterial infections", availability=True, price=120),
            MedicineResponse(id=4, name="ORS", type="Powder", use="Rehydration", availability=True, price=15),
            MedicineResponse(id=5, name="Cough Syrup", type="Syrup", use="Cough relief", availability=False, price=85),
            MedicineResponse(id=6, name="Amoxicillin", type="Capsule", use="Bacterial infection", availability=True, price=95),
            MedicineResponse(id=7, name="Metformin", type="Tablet", use="Diabetes control", availability=True, price=50),
            MedicineResponse(id=8, name="Amlodipine", type="Tablet", use="Blood pressure control", availability=True, price=40),
            MedicineResponse(id=9, name="Cetirizine", type="Tablet", use="Allergy relief", availability=True, price=10),
            MedicineResponse(id=10, name="Pantoprazole", type="Tablet", use="Acidity and GERD", availability=True, price=60),
            MedicineResponse(id=11, name="Dolo 650", type="Tablet", use="Fever and body pain", availability=True, price=30),
            MedicineResponse(id=12, name="Zincovit", type="Tablet", use="Vitamin supplement", availability=True, price=90),
            MedicineResponse(id=13, name="Liv 52", type="Syrup", use="Liver health", availability=True, price=110),
            MedicineResponse(id=14, name="Insulin", type="Injection", use="Diabetes treatment", availability=True, price=250),
            MedicineResponse(id=15, name="Saline IV", type="Injection", use="Fluid replacement", availability=True, price=70),
            MedicineResponse(id=16, name="Ranitidine", type="Tablet", use="Acidity relief", availability=True, price=25),
            MedicineResponse(id=17, name="Diclofenac", type="Tablet", use="Pain relief", availability=True, price=45),
            MedicineResponse(id=18, name="Hydroxychloroquine", type="Tablet", use="Autoimmune diseases", availability=True, price=150),
            MedicineResponse(id=19, name="Vitamin C", type="Tablet", use="Immunity booster", availability=True, price=20),
            MedicineResponse(id=20, name="Antacid Gel", type="Liquid", use="Acidity relief", availability=True, price=55),
            MedicineResponse(id=21, name="Domperidone", type="Tablet", use="Nausea and vomiting", availability=True, price=45),
            MedicineResponse(id=22, name="Ondansetron", type="Tablet", use="Anti-vomiting", availability=True, price=60),
            MedicineResponse(id=23, name="Loperamide", type="Tablet", use="Diarrhea control", availability=True, price=25),
            MedicineResponse(id=24, name="Digene", type="Tablet", use="Acidity relief", availability=True, price=30),
            MedicineResponse(id=25, name="Gelusil", type="Liquid", use="Acidity and gas", availability=True, price=55),
            MedicineResponse(id=26, name="Montelukast", type="Tablet", use="Allergy and asthma", availability=True, price=80),
            MedicineResponse(id=27, name="Levocetirizine", type="Tablet", use="Allergy relief", availability=True, price=15),
            MedicineResponse(id=28, name="Salbutamol", type="Inhaler", use="Asthma relief", availability=True, price=70),
            MedicineResponse(id=29, name="Budesonide", type="Inhaler", use="Respiratory inflammation", availability=True, price=120),
            MedicineResponse(id=30, name="Theophylline", type="Tablet", use="Breathing disorders", availability=True, price=65),
            MedicineResponse(id=31, name="Clotrimazole", type="Cream", use="Fungal infections", availability=True, price=50),
            MedicineResponse(id=32, name="Ketoconazole", type="Shampoo", use="Dandruff treatment", availability=True, price=90),
            MedicineResponse(id=33, name="Hydrocortisone", type="Cream", use="Skin inflammation", availability=True, price=70),
            MedicineResponse(id=34, name="Calamine Lotion", type="Lotion", use="Skin irritation relief", availability=True, price=40),
            MedicineResponse(id=35, name="Mupirocin", type="Ointment", use="Bacterial skin infection", availability=True, price=110),
            MedicineResponse(id=36, name="Iron Tablets", type="Tablet", use="Anemia treatment", availability=True, price=30),
            MedicineResponse(id=37, name="Calcium Tablets", type="Tablet", use="Bone strength", availability=True, price=60),
            MedicineResponse(id=38, name="Vitamin D3", type="Capsule", use="Vitamin deficiency", availability=True, price=90),
            MedicineResponse(id=39, name="Folic Acid", type="Tablet", use="Pregnancy supplement", availability=True, price=20),
            MedicineResponse(id=40, name="Multivitamin Syrup", type="Syrup", use="General health", availability=True, price=75),
            MedicineResponse(id=41, name="Insulin Regular", type="Injection", use="Diabetes control", availability=True, price=300),
            MedicineResponse(id=42, name="Glimepiride", type="Tablet", use="Blood sugar control", availability=True, price=50),
            MedicineResponse(id=43, name="Losartan", type="Tablet", use="Blood pressure", availability=True, price=55),
            MedicineResponse(id=44, name="Atenolol", type="Tablet", use="Hypertension", availability=True, price=40),
            MedicineResponse(id=45, name="Clopidogrel", type="Tablet", use="Heart protection", availability=True, price=120),
            MedicineResponse(id=46, name="Rabies Vaccine", type="Injection", use="Rabies prevention", availability=True, price=450),
            MedicineResponse(id=47, name="Tetanus Injection", type="Injection", use="Wound protection", availability=True, price=150),
            MedicineResponse(id=48, name="Amoxiclav", type="Tablet", use="Severe infection", availability=True, price=180),
            MedicineResponse(id=49, name="Cefixime", type="Tablet", use="Bacterial infection", availability=True, price=140),
            MedicineResponse(id=50, name="Doxycycline", type="Capsule", use="Infections and acne", availability=True, price=95)
        ]
        response = [m for m in mock_dataset if q_lower in m.name.lower()]
        
    return response
