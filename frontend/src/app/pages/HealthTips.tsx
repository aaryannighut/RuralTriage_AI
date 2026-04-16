import {
  Droplets,
  Heart,
  Thermometer,
  Sun,
  Moon,
  Apple,
  Salad,
  Dumbbell,
  Shield,
  Baby,
  Smile,
  Activity,
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function HealthTips() {
  const { t } = useLanguage();
  const tipCategories = [
    {
      category: "Hygiene & Prevention",
      color: "#4F7DF3",
      tips: [
        {
          icon: Droplets,
          title: "Drink Clean Water",
          description:
            "Always drink clean, filtered, or boiled water to avoid waterborne diseases like diarrhea, cholera, and typhoid.",
        },
        {
          icon: Heart,
          title: "Wash Hands Regularly",
          description:
            "Wash your hands with soap before eating, after using the toilet, and after coming from outside to prevent infections.",
        },
        {
          icon: Shield,
          title: "Use Mosquito Nets",
          description:
            "Sleep under mosquito nets and keep your surroundings clean to prevent malaria and dengue.",
        },
      ],
    },
    {
      category: "Nutrition & Diet",
      color: "#A7E3C9",
      tips: [
        {
          icon: Apple,
          title: "Eat Fresh Fruits & Vegetables",
          description:
            "Include seasonal fruits and green vegetables in your daily diet for vitamins and minerals.",
        },
        {
          icon: Salad,
          title: "Balanced Diet",
          description:
            "Eat a mix of grains, pulses, vegetables, and dairy products for complete nutrition.",
        },
        {
          icon: Sun,
          title: "Get Enough Vitamin D",
          description:
            "Spend 15-20 minutes in morning sunlight to get natural vitamin D for strong bones.",
        },
      ],
    },
    {
      category: "Daily Health Habits",
      color: "#FFD6A5",
      tips: [
        {
          icon: Dumbbell,
          title: "Stay Physically Active",
          description:
            "Do simple exercises, walk regularly, or do farming activities to keep your body fit and healthy.",
        },
        {
          icon: Moon,
          title: "Get Adequate Sleep",
          description:
            "Sleep 7-8 hours daily. Good sleep helps your body recover and stay strong.",
        },
        {
          icon: Smile,
          title: "Manage Stress",
          description:
            "Take time to relax, talk to family, or practice deep breathing to reduce stress.",
        },
      ],
    },
    {
      category: "When to Seek Medical Help",
      color: "#4F7DF3",
      tips: [
        {
          icon: Thermometer,
          title: "Monitor Persistent Fever",
          description:
            "If fever lasts more than 3 days or is very high, consult a doctor immediately.",
        },
        {
          icon: Activity,
          title: "Check Unusual Symptoms",
          description:
            "Seek medical help for severe pain, difficulty breathing, bleeding, or sudden weakness.",
        },
        {
          icon: Baby,
          title: "Child Health Checkups",
          description:
            "Take children for regular vaccination and growth monitoring at health centers.",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1
            className="text-2xl md:text-3xl lg:text-4xl text-[#1E293B] mb-4"
            style={{ fontWeight: 700 }}
          >
            {t("Daily Health Tips")}
          </h1>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
            {t("Simple and practical health advice for better living in rural areas")}
          </p>
        </div>

        {/* Tip Categories */}
        <div className="space-y-12">
          {tipCategories.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <div className="mb-6">
                <h2
                  className="text-xl md:text-2xl text-[#1E293B] mb-2"
                  style={{ fontWeight: 700 }}
                >
                  {t(category.category)}
                </h2>
                <div
                  className="w-20 h-1 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {category.tips.map((tip, tipIndex) => {
                  const Icon = tip.icon;
                  return (
                    <div
                      key={tipIndex}
                      className="bg-white rounded-md p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div
                        className="w-14 h-14 rounded-md flex items-center justify-center mb-4"
                        style={{ backgroundColor: `${category.color}15` }}
                      >
                        <Icon className="w-7 h-7" style={{ color: category.color }} />
                      </div>
                      <h3
                        className="text-lg text-[#1E293B] mb-3"
                        style={{ fontWeight: 600 }}
                      >
                        {t(tip.title)}
                      </h3>
                      <p className="text-[#64748B] leading-relaxed">
                        {t(tip.description)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Emergency Notice */}
        <div className="mt-12 bg-white rounded-md p-8 shadow-sm border-2 border-[#4F7DF3]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-md bg-[#4F7DF3]/10 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-[#4F7DF3]" />
            </div>
            <h3
              className="text-xl text-[#1E293B] mb-3"
              style={{ fontWeight: 700 }}
            >
              {t("In Case of Emergency")}
            </h3>
            <p className="text-[#64748B] mb-6 max-w-2xl mx-auto">
              {t("For serious health emergencies, please call emergency services or visit the nearest health center immediately. Don't delay seeking professional medical help.")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="tel:108"
                className="px-8 py-4 bg-[#4F7DF3] text-white rounded-md hover:bg-[#3D6DE3] transition-colors"
              >
                {t("Call Emergency")}: 108
              </a>
              <button
                onClick={() => (window.location.href = "/talk-to-doctor")}
                className="px-8 py-4 bg-white text-[#4F7DF3] border-2 border-[#4F7DF3] rounded-md hover:bg-[#F8FAFC] transition-colors"
              >
                {t("Talk to Doctor")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
