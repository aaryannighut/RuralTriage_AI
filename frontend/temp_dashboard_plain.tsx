      {/* ΓöÇΓöÇ ANALYTICS CARDS ΓöÇΓöÇ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Patients" value={stats?.today_patients ?? todayCount} icon={<Users className="w-8 h-8" />} accent />
        <StatCard label="Total Queued"     value={stats?.total_queued ?? queue.length} icon={<ClipboardList className="w-8 h-8" />} />
        <StatCard label="Completed"        value={stats?.completed ?? completedCount} icon={<CheckCircle className="w-8 h-8" />} />
        <StatCard label="High Risk" value={stats?.high_risk ?? highRisk.length} icon={<AlertTriangle className="w-8 h-8" />} danger={(stats?.high_risk ?? highRisk.length) > 0} />
      </div>

      {/* ΓöÇΓöÇ AVAILABILITY CONTROL ΓöÇΓöÇ */}
      <div className="border border-slate-300 bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Activity className="w-4 h-4 text-[#0056b3]" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-700">Availability</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(AVAIL_MAP).map(([key, cfg]) => (
            <button key={key} onClick={() => handleAvailability(key)}
              className={`px-5 py-2 font-black uppercase text-[10px] tracking-widest flex items-center gap-2 border transition-all ${
                availability === key ? `${cfg.cls} border-transparent` : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
              }`}>
              <span className={`w-2 h-2 rounded-full ${availability === key ? cfg.dot : "bg-slate-300"}`} />
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

        </div>
      )}

      {openSection === "queue" && (
        <PageSection title="Patient Queue" icon={<ClipboardList className="w-5 h-5" />} badge={`${queue.length} pending`}>
        {queue.length === 0 ? (
          <div className="p-12 text-center text-slate-400 uppercase font-bold text-xs tracking-widest border-t border-slate-200">
            No patients in queue.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {queue.map((p, i) => (
              <div key={p.appointment_id} className={`p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${p.priority === "HIGH" ? "bg-red-50/40" : ""}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-9 h-9 flex items-center justify-center font-black text-sm shrink-0
                    ${p.priority === "HIGH" ? "bg-red-600 text-white" : "bg-[#0056b3] text-white"}`}>
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold uppercase text-sm truncate">{p.patient_name}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase">{p.date} {p.time}</div>
                    {p.symptoms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.symptoms.slice(0, 3).map((s, j) => (
                          <span key={j} className="px-1.5 py-0.5 bg-yellow-50 border border-yellow-200 text-[9px] font-bold uppercase text-yellow-800">{s.symptom_name}</span>
                        ))}
                        {p.symptoms.length > 3 && <span className="text-[9px] text-slate-400">+{p.symptoms.length - 3} more</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-1 text-[9px] font-black border uppercase ${PRIORITY_STYLE[p.priority]}`}>{p.priority}</span>
                  <button onClick={() => setViewingId(p.patient_id)}
                    className="p-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-600">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setPrescribing({ patient_id: p.patient_id, patient_name: p.patient_name })}
                    className="p-2 border border-blue-300 bg-[#e6f2ff] hover:bg-blue-100 text-[#0056b3]">
                    <Pill className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setReportingApt({
                      id: p.appointment_id,
                      patient_id: p.patient_id,
                      patient_name: p.patient_name,
                      doctor_name: profile?.name || "Doctor",
                      specialty: p.specialty,
                      date: p.date,
                      time: p.time,
                      status: "Scheduled",
                      meeting_link: null,
                      notes: p.symptoms?.map(s => `${s.symptom_name} (${s.duration || 'unknown'})`).join(", ") || "No specific symptoms on record."
                  })}
                    className="p-2 border border-green-300 bg-green-50 hover:bg-green-100 text-green-700"
                    title="Generate AI Report based on symptoms">
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => navigate(`/test-call?room=room-${p.appointment_id}`)}
                    className="px-4 py-2 bg-[#0056b3] text-white text-[9px] font-black uppercase tracking-widest hover:bg-blue-800 flex items-center gap-1">
                    <Video className="w-3 h-3" /> Consult
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </PageSection>
      )}

      {openSection === "family" && (
        <PageSection title="Enrolled Family Patients" icon={<User className="w-5 h-5" />} badge={`${familyPatients.length} enrolled`}>
          {familyPatients.length === 0 ? (
            <div className="p-12 text-center text-slate-400 uppercase font-bold text-xs tracking-widest border-t border-slate-200">
              No patients have enrolled you as their family doctor yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {familyPatients.map((p) => (
                <div key={p.patient_id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 flex items-center justify-center font-black text-sm shrink-0 bg-[#0056b3] text-white">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold uppercase text-sm truncate">{p.patient_name}</div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Age: {p.age || "N/A"} ΓÇó Gender: {p.gender || "N/A"} ΓÇó Phone: {p.phone || "N/A"}</div>
                      {p.symptoms && p.symptoms.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.symptoms.slice(0, 3).map((s: any, j: number) => (
                            <span key={j} className="px-1.5 py-0.5 bg-yellow-50 border border-yellow-200 text-[9px] font-bold uppercase text-yellow-800">{s.symptom_name}</span>
                          ))}
                          {p.symptoms.length > 3 && <span className="text-[9px] text-slate-400">+{p.symptoms.length - 3} more</span>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setViewingId(p.patient_id)}
                      className="px-3 py-2 flex items-center gap-1.5 border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 outline-none" title="View Medical Record">
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">History</span>
                    </button>
                    <button onClick={() => setPrescribing({ patient_id: p.patient_id, patient_name: p.patient_name })}
                      className="px-3 py-2 flex items-center gap-1.5 border border-blue-300 bg-[#e6f2ff] hover:bg-blue-100 text-[#0056b3] outline-none" title="Issue Prescription">
                      <Pill className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Prescribe</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageSection>
      )}

      {openSection === "appointments" && (
        <PageSection title="Appointment Schedule" icon={<Calendar className="w-5 h-5" />} badge={`${schedule.length} total`}>
        {schedule.length === 0 ? (
          <div className="p-12 text-center text-slate-400 uppercase font-bold text-xs tracking-widest">No appointments on record.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#e6f2ff] border-b border-slate-300">