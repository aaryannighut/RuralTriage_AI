import { Link } from "react-router";
import { Home } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

export function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center py-8 px-4">
      <div className="text-center">
        <h1
          className="text-6xl md:text-8xl text-[#4F7DF3] mb-4"
          style={{ fontWeight: 700 }}
        >
          404
        </h1>
        <h2
          className="text-2xl md:text-3xl text-[#1E293B] mb-4"
          style={{ fontWeight: 600 }}
        >
          {t("Page Not Found")}
        </h2>
        <p className="text-lg text-[#64748B] mb-8">
          {t("The page you are looking for doesn't exist or has been moved.")}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#4F7DF3] text-white rounded-md hover:bg-[#3D6DE3] transition-colors"
        >
          <Home className="w-5 h-5" />
          {t("Back to Home")}
        </Link>
      </div>
    </div>
  );
}
