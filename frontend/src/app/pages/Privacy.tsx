export function Privacy() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-md p-8 md:p-12 shadow-sm">
          <h1
            className="text-2xl md:text-3xl lg:text-4xl text-[#1E293B] mb-6"
            style={{ fontWeight: 700 }}
          >
            Privacy Policy
          </h1>
          <div className="space-y-6 text-[#64748B] leading-relaxed">
            <section>
              <h2 className="text-xl text-[#1E293B] mb-3" style={{ fontWeight: 600 }}>
                Your Privacy Matters
              </h2>
              <p>
                At RuralTriage AI, we are committed to protecting your personal and medical
                information. Your privacy and data security are our top priorities.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-[#1E293B] mb-3" style={{ fontWeight: 600 }}>
                Information We Collect
              </h2>
              <p>
                We collect only the information necessary to provide you with quality
                healthcare services, including your name, contact details, and medical
                history.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-[#1E293B] mb-3" style={{ fontWeight: 600 }}>
                How We Protect Your Data
              </h2>
              <p>
                All your medical records and personal information are encrypted and stored
                securely. We follow strict security protocols to ensure your data is safe.
              </p>
            </section>

            <section>
              <h2 className="text-xl text-[#1E293B] mb-3" style={{ fontWeight: 600 }}>
                Contact Us
              </h2>
              <p>
                If you have any questions about our privacy practices, please contact our
                support team.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
