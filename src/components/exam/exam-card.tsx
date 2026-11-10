import Link from "next/link";
import { CalendarClock, Clock, HelpCircle, Layers, RotateCw, Users } from "lucide-react";
import { startExamAction, toggleRegistrationAction } from "@/app/actions/exam";
import { buttonClasses } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { DIFFICULTY_LABEL, formatDateTime, formatMinutes, formatPercent } from "@/lib/format";
import { PHASE_LABEL, PHASE_TONE } from "@/lib/exam-phase";
import type { StudentExam } from "@/lib/exam/list";

export function ExamCard({ exam: e }: { exam: StudentExam }) {
  const left = e.attemptLimit - e.attemptsUsed;
  return (
    <Card className="flex flex-col p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={PHASE_TONE[e.phase]}>{PHASE_LABEL[e.phase]}</Badge>
        <Badge tone="gold">{e.subjectName}</Badge>
        <Badge>{DIFFICULTY_LABEL[e.difficulty]}</Badge>
        {e.assigned && <Badge tone="info"><Users size={12} /> Sizə təyin olunub</Badge>}
      </div>
      <h3 className="mt-3 font-display text-xl font-semibold">{e.title}</h3>
      {e.description && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{e.description}</p>}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-2"><Clock size={15} className="text-accent-ink" aria-hidden /><dt className="sr-only">Müddət</dt><dd>{formatMinutes(e.durationMin)}</dd></div>
        <div className="flex items-center gap-2"><HelpCircle size={15} className="text-accent-ink" aria-hidden /><dt className="sr-only">Sual sayı</dt><dd>{e.questionCount} sual</dd></div>
        <div className="col-span-2 flex items-center gap-2"><CalendarClock size={15} className="text-accent-ink" aria-hidden /><dt className="sr-only">Pəncərə</dt><dd>{formatDateTime(e.startsAt)} – {formatDateTime(e.endsAt)}</dd></div>
        <div className="flex items-center gap-2"><RotateCw size={15} className="text-accent-ink" aria-hidden /><dt className="sr-only">Cəhdlər</dt><dd>{e.attemptsUsed} / {e.attemptLimit} cəhd</dd></div>
        <div className="flex items-center gap-2"><Layers size={15} className="text-accent-ink" aria-hidden /><dt className="sr-only">Sual növü</dt><dd>Test</dd></div>
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {e.phase === "live" && e.openAttempt && <Link href={`/imtahan/${e.openAttempt.id}`} className={buttonClasses("primary", "md")}>Davam et</Link>}
        {e.phase === "live" && !e.openAttempt && left > 0 && (
          <ConfirmButton
            variant="primary" size="md" confirmLabel="Başla" title={`“${e.title}” sınağına başlayırsınız`}
            description={`Başladıqdan sonra ${formatMinutes(e.durationMin)} geri sayılacaq və dayandırıla bilməz. Bağlantı kəsilsə, eyni cəhdə qayıda bilərsiniz. Qalan cəhd: ${left}.`}
            action={startExamAction.bind(null, e.id)}
          >
            {e.attemptsUsed ? "Yenidən cəhd et" : "Sınağa başla"}
          </ConfirmButton>
        )}
        {e.phase === "live" && !e.openAttempt && left <= 0 && <span className="text-sm font-semibold text-muted">Cəhd limiti dolub</span>}
        {e.phase === "upcoming" && (
          <ConfirmButton variant={e.registered ? "outline" : "primary"} size="md" confirmLabel={e.registered ? "Ləğv et" : "Qeydiyyatdan keç"} title={e.registered ? "Qeydiyyat ləğv edilsin?" : "Sınağa qeydiyyat"} description={e.registered ? "Sınaq başlayanda xatırlatma almayacaqsınız." : `Sınaq ${formatDateTime(e.startsAt)} tarixində başlayır. Təsdiq bildirişi göndəriləcək.`} action={toggleRegistrationAction.bind(null, e.id)}>
            {e.registered ? "Qeydiyyatı ləğv et" : "Qeydiyyatdan keç"}
          </ConfirmButton>
        )}
        {e.lastAttempt && (
          <Link href={`/panel/neticelerim/${e.lastAttempt.id}`} className={buttonClasses("outline", "md")}>
            Nəticə{e.lastAttempt.released && e.lastAttempt.percentage !== null ? `: ${formatPercent(e.lastAttempt.percentage)}` : ""}
          </Link>
        )}
      </div>
    </Card>
  );
}
