import { useLanguage } from "../context/LanguageContext";

export function About() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-md p-8 md:p-12 shadow-sm">
          <h1
            className="text-2xl md:text-3xl lg:text-4xl text-[#1E293B] mb-6"
            style={{ fontWeight: 700 }}
          >
            {t("About RuralTriage AI")}
          </h1>
          <div className="space-y-4 text-[#64748B] leading-relaxed">
            <p>
              {t("RuralTriage AI is a telemedicine platform designed specifically for rural communities, providing accessible healthcare services to villages and remote areas.")}
            </p>
            <p>
              {t("Our mission is to bridge the healthcare gap between urban and rural areas by offering easy-to-use digital health services that anyone can access from their mobile phone.")}
            </p>
            <p>
              {t("Through our platform, rural residents can consult with qualified doctors, check their symptoms, find nearby pharmacies, and maintain their health records securely.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
