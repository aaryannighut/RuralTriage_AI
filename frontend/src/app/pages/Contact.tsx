import { Mail, Phone, MapPin } from "lucide-react";

export function Contact() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-md p-8 md:p-12 shadow-sm">
          <h1
            className="text-2xl md:text-3xl lg:text-4xl text-[#1E293B] mb-8"
            style={{ fontWeight: 700 }}
          >
            Contact Us
          </h1>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-[#4F7DF3]/10 flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-[#4F7DF3]" />
              </div>
              <div>
                <h3 className="text-lg text-[#1E293B] mb-1" style={{ fontWeight: 600 }}>
                  Phone
                </h3>
                <p className="text-[#64748B]">+91 1800-XXX-XXXX (Toll Free)</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-[#4F7DF3]/10 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-[#4F7DF3]" />
              </div>
              <div>
                <h3 className="text-lg text-[#1E293B] mb-1" style={{ fontWeight: 600 }}>
                  Email
                </h3>
                <p className="text-[#64748B]">support@ruralcare.health</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-md bg-[#4F7DF3]/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-6 h-6 text-[#4F7DF3]" />
              </div>
              <div>
                <h3 className="text-lg text-[#1E293B] mb-1" style={{ fontWeight: 600 }}>
                  Support Hours
                </h3>
                <p className="text-[#64748B]">Monday - Sunday, 8:00 AM - 8:00 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
