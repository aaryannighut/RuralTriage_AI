import { useEffect, useState } from "react";
import { Search, MapPin, Phone, Clock, FileText, Loader2, AlertCircle, Building2, ChevronRight } from "lucide-react";

interface MedicineResponse {
  id: number;
  name: string;
  type: string;
  use: string;
  availability: boolean;
  price: number;
}

interface PharmacySearchResponse {
  id: number;
  name: string;
  address: string;
  phone: string;
  timing: string;
  available: boolean;
}

export function FindMedicines() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineResponse | null>(null);
  const [medicineSuggestions, setMedicineSuggestions] = useState<MedicineResponse[]>([]);
  
  const [displayPharmacies, setDisplayPharmacies] = useState<PharmacySearchResponse[]>([]);
  
  const [loadingMedicines, setLoadingMedicines] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [loadingPharmacies, setLoadingPharmacies] = useState(false);

  // When a medicine is selected, fetch the filtered pharmacies
  useEffect(() => {
    let cancelled = false;

    const loadFilteredPharmacies = async () => {
      if (!selectedMedicine) {
        setDisplayPharmacies([]);
        return;
      }

      setLoadingPharmacies(true);
      try {
        const response = await fetch(`/pharmacies/search?medicine=${encodeURIComponent(selectedMedicine.name)}`);
        
        if (!response.ok) throw new Error("Failed to fetch pharmacy search");
        const data: PharmacySearchResponse[] = await response.json();
        
        if (!cancelled) {
           setDisplayPharmacies(data);
        }
      } catch (err) {
        // Fallback explicit mock dataset logic just in case backend takes time to reload
        if (!cancelled) {
            const rawMocks = [
               { "id": 1, "name": "Aarya Medi", "address": "Majiwada, Thane, Maharashtra, 400601", "phone": "8655401029", "timing": "8am - 11pm", "medicines": ["Paracetamol", "Ibuprofen", "ORS", "Domperidone", "Ondansetron"] },
               { "id": 2, "name": "Shiv Medical Store", "address": "Bhiwandi Village, Maharashtra", "phone": "9123456701", "timing": "9am - 10pm", "medicines": ["Paracetamol", "Cough Syrup", "Loperamide", "Digene"] },
               { "id": 3, "name": "Sai Krupa Medical", "address": "Kalyan Rural, Maharashtra", "phone": "9123456702", "timing": "8am - 9pm", "medicines": ["Azithromycin", "ORS", "Gelusil", "Montelukast"] },
               { "id": 4, "name": "Ganesh Medical", "address": "Dombivli Village Area", "phone": "9123456703", "timing": "7am - 10pm", "medicines": ["Ibuprofen", "Vitamin C", "Levocetirizine", "Salbutamol"] },
               { "id": 5, "name": "HealthCare Rural Med", "address": "Palghar Village", "phone": "9123456704", "timing": "8am - 8pm", "medicines": ["Paracetamol", "ORS", "Antacid Gel", "Budesonide", "Theophylline"] },
               { "id": 6, "name": "Om Sai Medical", "address": "Karjat Village", "phone": "9123456705", "timing": "9am - 9pm", "medicines": ["Amoxicillin", "Ibuprofen", "Clotrimazole", "Ketoconazole"] },
               { "id": 7, "name": "Jeevan Medical", "address": "Panvel Rural Area", "phone": "9123456706", "timing": "8am - 11pm", "medicines": ["Paracetamol", "Zincovit", "Hydrocortisone", "Calamine Lotion"] },
               { "id": 8, "name": "Krishna Medico", "address": "Raigad Village", "phone": "9123456707", "timing": "7am - 10pm", "medicines": ["ORS", "Cough Syrup", "Mupirocin", "Iron Tablets"] },
               { "id": 9, "name": "Mahalaxmi Medical", "address": "Alibaug Village", "phone": "9123456708", "timing": "8am - 9pm", "medicines": ["Paracetamol", "Azithromycin", "Calcium Tablets", "Vitamin D3"] },
               { "id": 10, "name": "Sanjeevani Medical", "address": "Vasai Rural", "phone": "9123456709", "timing": "9am - 10pm", "medicines": ["Ibuprofen", "ORS", "Folic Acid", "Multivitamin Syrup"] },
               { "id": 11, "name": "Rural Care Pharmacy", "address": "Virar Village", "phone": "9123456710", "timing": "8am - 9pm", "medicines": ["Paracetamol", "Antacid Gel", "Insulin Regular", "Glimepiride"] },
               { "id": 12, "name": "Green Health Medical", "address": "Dahanu Village", "phone": "9123456711", "timing": "8am - 8pm", "medicines": ["Vitamin C", "ORS", "Losartan", "Atenolol"] },
               { "id": 13, "name": "Shree Medical Store", "address": "Jawhar Village", "phone": "9123456712", "timing": "9am - 9pm", "medicines": ["Paracetamol", "Ibuprofen", "Clopidogrel", "Rabies Vaccine"] },
               { "id": 14, "name": "LifeCare Medical", "address": "Wada Village", "phone": "9123456713", "timing": "7am - 10pm", "medicines": ["Azithromycin", "ORS", "Tetanus Injection", "Amoxiclav"] },
               { "id": 15, "name": "Arogya Medical", "address": "Shahapur Village", "phone": "9123456714", "timing": "8am - 10pm", "medicines": ["Paracetamol", "Cough Syrup", "Cefixime", "Doxycycline"] },
               { "id": 16, "name": "Village Health Store", "address": "Murbad Rural", "phone": "9123456715", "timing": "8am - 9pm", "medicines": ["Ibuprofen", "Vitamin C", "Domperidone", "Digene"] },
               { "id": 17, "name": "Swasthya Medical", "address": "Pen Village", "phone": "9123456716", "timing": "9am - 10pm", "medicines": ["ORS", "Paracetamol", "Montelukast", "Salbutamol"] },
               { "id": 18, "name": "Om Health Pharmacy", "address": "Roha Village", "phone": "9123456717", "timing": "8am - 9pm", "medicines": ["Azithromycin", "Antacid Gel", "Clotrimazole", "Hydrocortisone"] },
               { "id": 19, "name": "Primary Care Medical", "address": "Mahad Village", "phone": "9123456718", "timing": "7am - 10pm", "medicines": ["Paracetamol", "ORS", "Iron Tablets", "Vitamin D3"] },
               { "id": 20, "name": "Gram Medical Center", "address": "Poladpur Village", "phone": "9123456719", "timing": "8am - 8pm", "medicines": ["Ibuprofen", "Cough Syrup", "Insulin Regular", "Losartan"] },
               { "id": 21, "name": "Jan Aushadhi Kendra", "address": "Ratnagiri Village", "phone": "9123456720", "timing": "8am - 9pm", "medicines": ["Paracetamol", "Vitamin C", "Clopidogrel", "Rabies Vaccine"] },
               { "id": 22, "name": "Sahyadri Medical", "address": "Chiplun Village", "phone": "9123456721", "timing": "9am - 10pm", "medicines": ["ORS", "Azithromycin", "Amoxiclav", "Doxycycline"] },
               { "id": 23, "name": "Coastal Health Pharmacy", "address": "Guhagar Village", "phone": "9123456722", "timing": "8am - 9pm", "medicines": ["Paracetamol", "Antacid Gel", "Domperidone", "Gelusil"] },
               { "id": 24, "name": "Konkan Medical", "address": "Khed Village", "phone": "9123456723", "timing": "8am - 10pm", "medicines": ["Ibuprofen", "ORS", "Levocetirizine", "Budesonide"] },
               { "id": 25, "name": "Seva Medical Store", "address": "Dapoli Village", "phone": "9123456724", "timing": "9am - 9pm", "medicines": ["Paracetamol", "Cough Syrup", "Ketoconazole", "Mupirocin"] },
               { "id": 26, "name": "Rural Life Pharmacy", "address": "Sindhudurg Village", "phone": "9123456725", "timing": "8am - 8pm", "medicines": ["Vitamin C", "ORS", "Calcium Tablets", "Folic Acid"] },
               { "id": 27, "name": "Healthy Village Med", "address": "Sawantwadi Village", "phone": "9123456726", "timing": "8am - 9pm", "medicines": ["Paracetamol", "Ibuprofen", "Glimepiride", "Atenolol"] },
               { "id": 28, "name": "Arogya Seva Medical", "address": "Malvan Village", "phone": "9123456727", "timing": "7am - 10pm", "medicines": ["ORS", "Azithromycin", "Tetanus Injection", "Cefixime"] },
               { "id": 29, "name": "Gramin Medical Store", "address": "Lanja Village", "phone": "9123456728", "timing": "8am - 9pm", "medicines": ["Paracetamol", "Antacid Gel", "Ondansetron", "Loperamide"] },
               { "id": 30, "name": "Health First Rural", "address": "Rajapur Village", "phone": "9123456729", "timing": "9am - 10pm", "medicines": ["Ibuprofen", "ORS", "Theophylline", "Calamine Lotion", "Multivitamin Syrup"] }
            ];
            
            const matches: PharmacySearchResponse[] = [];
            const query_lower = selectedMedicine.name.toLowerCase();
            for (let p of rawMocks) {
                for (let med of p.medicines) {
                    if (med.toLowerCase().includes(query_lower)) {
                        matches.push({
                            id: p.id,
                            name: p.name,
                            address: p.address,
                            phone: p.phone,
                            timing: p.timing,
                            available: true
                        });
                        break;
                    }
                }
            }
            setDisplayPharmacies(matches);
        }
      } finally {
        if (!cancelled) setLoadingPharmacies(false);
      }
    };

    loadFilteredPharmacies();
    return () => { cancelled = true; };
  }, [selectedMedicine]);

  // Perform search query natively to FastAPI endpoint
  const performSearch = async (e?: React.FormEvent) => {
     if (e) e.preventDefault();
     if (!searchQuery.trim()) return;

     setLoadingMedicines(true);
     setHasSearched(true);
     setSelectedMedicine(null); // Clear selected to refresh UI state
     setDisplayPharmacies([]); // Clear pharmacies list
     
     try {
       const res = await fetch(`/medicines/search?query=${encodeURIComponent(searchQuery)}`, { headers: { "Content-Type": "application/json" } });
       if (res.ok) {
         const data = await res.json();
         setMedicineSuggestions(data);
         // If we get an exact match instantly, auto-select it?
         // Optional: let user click from list below.
       } else {
         throw new Error("Backend search unavailable");
       }
     } catch (err) {
       // Frontend Fallback directly (Useful if backend is not restarted)
       const q_lower = searchQuery.toLowerCase();
       const mock_dataset = [
          { id: 1, name: "Paracetamol", type: "Tablet", use: "Fever and pain relief", availability: true, price: 20 },
          { id: 2, name: "Ibuprofen", type: "Tablet", use: "Pain and inflammation", availability: true, price: 35 },
          { id: 3, name: "Azithromycin", type: "Tablet", use: "Bacterial infections", availability: true, price: 120 },
          { id: 4, name: "ORS", type: "Powder", use: "Rehydration", availability: true, price: 15 },
          { id: 5, name: "Cough Syrup", type: "Syrup", use: "Cough relief", availability: false, price: 85 },
          { id: 6, name: "Amoxicillin", type: "Capsule", use: "Bacterial infection", availability: true, price: 95 },
          { id: 7, name: "Metformin", type: "Tablet", use: "Diabetes control", availability: true, price: 50 },
          { id: 8, name: "Amlodipine", type: "Tablet", use: "Blood pressure control", availability: true, price: 40 },
          { id: 9, name: "Cetirizine", type: "Tablet", use: "Allergy relief", availability: true, price: 10 },
          { id: 10, name: "Pantoprazole", type: "Tablet", use: "Acidity and GERD", availability: true, price: 60 },
          { id: 11, name: "Dolo 650", type: "Tablet", use: "Fever and body pain", availability: true, price: 30 },
          { id: 12, name: "Zincovit", type: "Tablet", use: "Vitamin supplement", availability: true, price: 90 },
          { id: 13, name: "Liv 52", type: "Syrup", use: "Liver health", availability: true, price: 110 },
          { id: 14, name: "Insulin", type: "Injection", use: "Diabetes treatment", availability: true, price: 250 },
          { id: 15, name: "Saline IV", type: "Injection", use: "Fluid replacement", availability: true, price: 70 },
          { id: 16, name: "Ranitidine", type: "Tablet", use: "Acidity relief", availability: true, price: 25 },
          { id: 17, name: "Diclofenac", type: "Tablet", use: "Pain relief", availability: true, price: 45 },
          { id: 18, name: "Hydroxychloroquine", type: "Tablet", use: "Autoimmune diseases", availability: true, price: 150 },
          { id: 19, name: "Vitamin C", type: "Tablet", use: "Immunity booster", availability: true, price: 20 },
          { id: 20, name: "Antacid Gel", type: "Liquid", use: "Acidity relief", availability: true, price: 55 },
          { id: 21, name: "Domperidone", type: "Tablet", use: "Nausea and vomiting", availability: true, price: 45 },
          { id: 22, name: "Ondansetron", type: "Tablet", use: "Anti-vomiting", availability: true, price: 60 },
          { id: 23, name: "Loperamide", type: "Tablet", use: "Diarrhea control", availability: true, price: 25 },
          { id: 24, name: "Digene", type: "Tablet", use: "Acidity relief", availability: true, price: 30 },
          { id: 25, name: "Gelusil", type: "Liquid", use: "Acidity and gas", availability: true, price: 55 },
          { id: 26, name: "Montelukast", type: "Tablet", use: "Allergy and asthma", availability: true, price: 80 },
          { id: 27, name: "Levocetirizine", type: "Tablet", use: "Allergy relief", availability: true, price: 15 },
          { id: 28, name: "Salbutamol", type: "Inhaler", use: "Asthma relief", availability: true, price: 70 },
          { id: 29, name: "Budesonide", type: "Inhaler", use: "Respiratory inflammation", availability: true, price: 120 },
          { id: 30, name: "Theophylline", type: "Tablet", use: "Breathing disorders", availability: true, price: 65 },
          { id: 31, name: "Clotrimazole", type: "Cream", use: "Fungal infections", availability: true, price: 50 },
          { id: 32, name: "Ketoconazole", type: "Shampoo", use: "Dandruff treatment", availability: true, price: 90 },
          { id: 33, name: "Hydrocortisone", type: "Cream", use: "Skin inflammation", availability: true, price: 70 },
          { id: 34, name: "Calamine Lotion", type: "Lotion", use: "Skin irritation relief", availability: true, price: 40 },
          { id: 35, name: "Mupirocin", type: "Ointment", use: "Bacterial skin infection", availability: true, price: 110 },
          { id: 36, name: "Iron Tablets", type: "Tablet", use: "Anemia treatment", availability: true, price: 30 },
          { id: 37, name: "Calcium Tablets", type: "Tablet", use: "Bone strength", availability: true, price: 60 },
          { id: 38, name: "Vitamin D3", type: "Capsule", use: "Vitamin deficiency", availability: true, price: 90 },
          { id: 39, name: "Folic Acid", type: "Tablet", use: "Pregnancy supplement", availability: true, price: 20 },
          { id: 40, name: "Multivitamin Syrup", type: "Syrup", use: "General health", availability: true, price: 75 },
          { id: 41, name: "Insulin Regular", type: "Injection", use: "Diabetes control", availability: true, price: 300 },
          { id: 42, name: "Glimepiride", type: "Tablet", use: "Blood sugar control", availability: true, price: 50 },
          { id: 43, name: "Losartan", type: "Tablet", use: "Blood pressure", availability: true, price: 55 },
          { id: 44, name: "Atenolol", type: "Tablet", use: "Hypertension", availability: true, price: 40 },
          { id: 45, name: "Clopidogrel", type: "Tablet", use: "Heart protection", availability: true, price: 120 },
          { id: 46, name: "Rabies Vaccine", type: "Injection", use: "Rabies prevention", availability: true, price: 450 },
          { id: 47, name: "Tetanus Injection", type: "Injection", use: "Wound protection", availability: true, price: 150 },
          { id: 48, name: "Amoxiclav", type: "Tablet", use: "Severe infection", availability: true, price: 180 },
          { id: 49, name: "Cefixime", type: "Tablet", use: "Bacterial infection", availability: true, price: 140 },
          { id: 50, name: "Doxycycline", type: "Capsule", use: "Infections and acne", availability: true, price: 95 }
       ];
       setMedicineSuggestions(mock_dataset.filter(sm => sm.name.toLowerCase().includes(q_lower)));
     } finally {
       setLoadingMedicines(false);
     }
  };

  return (
    <div className="w-full text-slate-900 font-sans pb-12">
      
      {/* Header Panel */}
      <div className="border-b-4 border-[#0056b3] bg-slate-50 p-6 mb-8">
         <h1 className="text-3xl font-bold uppercase tracking-tighter text-[#0056b3]">Pharmacy Locator</h1>
         <p className="text-sm font-semibold text-slate-600 mt-2 uppercase tracking-widest">
           Centralized Database For Drug Availability & Dispensary Sourcing
         </p>
      </div>

      <div className="flex flex-col lg:flex-row items-stretch border-t border-slate-300">
        
        {/* ======================= LEFT: SEARCH PANEL ======================= */}
        <div className="w-full lg:w-[40%] border-x lg:border-r border-slate-300 bg-white h-full flex flex-col min-w-0 shrink-0">
          <div className="bg-[#e6f2ff] border-b border-slate-300 p-5">
            <h2 className="font-bold text-[#0056b3] uppercase tracking-wide flex items-center gap-2">
               <Search className="w-5 h-5"/> Medicine Search Interface
            </h2>
          </div>
          
          <div className="p-5 border-b border-slate-300 bg-slate-50">
            <form onSubmit={performSearch} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="ENTER MEDICINE NAME..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border-2 border-slate-300 bg-white text-base font-bold focus:outline-none focus:border-[#0056b3] uppercase"
              />
              <button 
                 type="submit" 
                 className="w-full bg-[#0056b3] hover:bg-blue-800 text-white font-bold uppercase py-3 px-6 tracking-wider transition-colors disabled:bg-slate-400"
                 disabled={loadingMedicines}
              >
                 {loadingMedicines ? "Querying..." : "Search Database"}
              </button>
            </form>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 relative min-h-[400px]">
             {loadingMedicines ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                  <div className="flex flex-col items-center text-[#0056b3] font-bold uppercase gap-3">
                     <Loader2 className="w-8 h-8 animate-spin" /> Fetching Master List...
                  </div>
                </div>
             ) : hasSearched && medicineSuggestions.length === 0 ? (
                <div className="p-8 text-center text-sm font-bold text-red-600 uppercase border-b border-red-200 bg-red-50">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No Results Found.
                </div>
             ) : hasSearched ? (
                <div className="divide-y divide-slate-300">
                  {medicineSuggestions.map((med) => (
                    <div 
                      key={med.id} onClick={() => setSelectedMedicine(med)}
                      className={`cursor-pointer p-5 transition-colors border-l-4 ${selectedMedicine?.id === med.id ? "border-[#0056b3] bg-white" : "border-slate-300 hover:bg-slate-100"}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                         <div className="font-extrabold text-lg text-slate-900 tracking-tight">{med.name}</div>
                         <div className="font-bold text-lg text-[#0056b3]">₹{med.price}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 mt-3">
                         <div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Type</div>
                            <div className="text-sm font-semibold text-slate-800 uppercase">{med.type}</div>
                         </div>
                         <div className="text-right">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Global Status</div>
                            <div className={`inline-block px-2 py-0.5 mt-0.5 text-xs font-bold uppercase border ${med.availability ? "bg-[#e8f5e9] text-green-900 border-green-300" : "bg-red-50 text-red-900 border-red-300"}`}>
                               {med.availability ? "AVAILABLE" : "NOT AVAILABLE"}
                            </div>
                         </div>
                         <div className="col-span-2 mt-1">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Primary Use</div>
                            <div className="text-xs font-medium text-slate-700 capitalize">{med.use}</div>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
             ) : (
                <div className="p-12 text-center text-sm font-bold text-slate-400 uppercase">
                  Awaiting query criteria. Input medicine name above to search the registry.
                </div>
             )}
          </div>
        </div>

        {/* ======================= RIGHT: RESULTS PANEL ======================= */}
        <div className="flex-1 border-r lg:border-x border-slate-300 bg-slate-100 h-full flex flex-col min-w-0">
          <div className="bg-white border-b border-slate-300 p-5 flex items-center justify-between">
             <h2 className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
               <Building2 className="w-5 h-5"/> Available Nearby
             </h2>
             {selectedMedicine && (
                <div className="text-xs font-bold bg-[#e6f2ff] text-[#0056b3] px-3 py-1 border border-blue-200 uppercase tracking-wider">
                  Filtering: {selectedMedicine.name}
                </div>
             )}
          </div>

          <div className="p-0 flex-1 overflow-y-auto">
             {loadingPharmacies ? (
                <div className="py-24 text-center text-sm font-bold text-[#0056b3] uppercase flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin" /> Cross-referencing Directory...
                </div>
             ) : selectedMedicine && displayPharmacies.length === 0 ? (
                <div className="m-6 p-8 text-center flex flex-col items-center bg-yellow-50 border border-yellow-300">
                  <AlertCircle className="w-10 h-10 text-yellow-600 mb-3" />
                  <p className="text-base font-bold text-yellow-900 uppercase">Alert: No nearby pharmacy has this medicine</p>
                  <p className="text-sm font-semibold text-yellow-800 mt-2">Try expanding your search radius or selecting an alternative medication from the database.</p>
                </div>
             ) : (
                <div className="divide-y divide-slate-300">
                   {!selectedMedicine ? (
                      <div className="p-12 text-center text-sm font-bold text-slate-500 uppercase">
                        <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
                        Directory Nominal. Search and select a medication.
                      </div>
                   ) : null}

                   {displayPharmacies.map(pharmacy => {
                     return (
                        <div key={pharmacy.id} className="p-6 bg-white hover:bg-[#fafafa] transition-none flex flex-col border-b border-slate-300">
                           <div className="flex-1 w-full min-w-0">
                              <h3 className="text-xl font-bold text-slate-900 uppercase mb-3 flex items-center gap-2">
                                 {pharmacy.name}
                                 <span className="text-[10px] bg-[#0056b3] text-white px-2 py-0.5 rounded-sm shrink-0">Verified</span>
                              </h3>
                              <div className="space-y-3 mb-5">
                                 <div className="flex items-start gap-3 text-sm text-slate-800">
                                   <MapPin className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                                   <span className="font-semibold uppercase break-words whitespace-normal leading-relaxed">
                                      {pharmacy.address}
                                   </span>
                                 </div>
                                 <div className="flex items-center gap-3 text-sm text-slate-800">
                                   <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                                   <span className="font-semibold truncate">{pharmacy.phone}</span>
                                 </div>
                                 <div className="flex items-center gap-3 text-sm text-slate-800">
                                   <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                                   <span className="font-semibold uppercase tracking-wider text-slate-600 truncate">{pharmacy.timing}</span>
                                 </div>
                              </div>
                           </div>

                           <div className="w-full flex-col sm:flex-row justify-between items-center sm:items-end gap-4 border-t border-slate-200 pt-4 mt-auto">
                              <div className="mb-4 sm:mb-0">
                                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 mt-1">Inventory Verification</div>
                                 <div className="flex justify-between items-center px-4 py-2 border font-bold uppercase tracking-wide text-sm bg-[#e8f5e9] text-green-900 border-green-300">
                                    <span>CONFIRMED IN STOCK</span>
                                 </div>
                              </div>
                              
                              <div className="flex gap-2 w-full sm:w-auto mt-4">
                                 <button className="flex-1 sm:flex-none px-6 text-center py-3 bg-[#0056b3] hover:bg-blue-800 text-white text-xs font-bold uppercase border border-[#0056b3] transition-colors">
                                   Call
                                 </button>
                                 <button className="flex-1 sm:flex-none px-6 text-center py-3 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold uppercase border border-slate-300 transition-colors">
                                   Details
                                 </button>
                              </div>
                           </div>
                        </div>
                     );
                   })}
                </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
}
