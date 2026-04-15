
import httpx
import json

BASE_URL = "http://localhost:8000"

def test_appointments():
    print("--- Testing Appointments API ---")
    
    # 1. Create Appointment
    data = {
        "patient_id": 1,
        "doctor_id": 1,
        "doctor_name": "Dr. Smith",
        "specialty": "Cardiology",
        "date": "2026-05-20",
        "time": "10:00",
        "notes": "Heart checkup"
    }
    try:
        r = httpx.post(f"{BASE_URL}/appointments/create", json=data)
        print(f"Create: {r.status_code}")
        apt = r.json()
        print(json.dumps(apt, indent=2))
        apt_id = apt["id"]
        
        # 2. Get Upcoming
        r = httpx.get(f"{BASE_URL}/appointments/upcoming/1")
        print(f"Upcoming: {len(r.json())} found")
        
        # 3. Reschedule
        r = httpx.put(f"{BASE_URL}/appointments/reschedule/{apt_id}", json={"new_date": "2026-05-21", "new_time": "11:00"})
        print(f"Reschedule: {r.status_code}")
        
        # 4. Cancel
        r = httpx.put(f"{BASE_URL}/appointments/cancel/{apt_id}")
        print(f"Cancel: {r.status_code}")
        
        # 5. History
        r = httpx.get(f"{BASE_URL}/appointments/history/1")
        print(f"History: {len(r.json())} found (Expected 1 since we cancelled it)")
        
    except Exception as e:
        print(f"Error during testing: {e}")

if __name__ == "__main__":
    test_appointments()
