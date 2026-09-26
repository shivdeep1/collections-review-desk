import type { CaseRecord, Source } from '../shared/domain.ts';
import { parseTranscript } from '../shared/domain.ts';

export const demoPolicy: Source['policy'] = {
  version: 'DEMO-COL-1.0',
  clauses: [
    { id: 'P1', title: 'Accurate case notes', text: 'A promise to pay must reflect an explicit customer commitment to an amount and a date. Record a disputed amount and a refusal or uncertainty accurately. Do not convert a conditional statement into an unconditional promise.' },
    { id: 'P2', title: 'Approved payment destinations', text: 'Collectors may direct customers only to destinations in the bank-supplied approved directory. A destination absent from a complete supplied directory is a discrepancy for supervisor review, not proof of fraud. If the directory is unavailable or incomplete, request verification.' },
    { id: 'P3', title: 'Respectful treatment', text: 'Collectors must communicate respectfully. Do not threaten public embarrassment, disclosure to unrelated third parties, or consequences unsupported by the supplied case evidence. A routine reminder of an overdue amount is not itself misconduct.' },
    { id: 'P4', title: 'Evidence before conclusions', text: 'Assess only the supplied conversation and records. If a recording excerpt or relevant data is missing, state the limitation. Do not infer payment, agreement, fraud or misconduct from silence or an ambiguous statement.' },
  ],
};
export const demoDirectory: Source['directory'] = {
  version: 'DEMO-PAY-2026-09', available: true, complete: true,
  destinations: ['collections@demo-bank', 'repay@demo-bank'],
};

const now = '2026-09-26T04:30:00.000Z';
function fixture(id: string, details: Partial<CaseRecord>, transcript: string, collectorNote: string, directory = demoDirectory): CaseRecord {
  return {
    id, customer: '', business: '', loanId: '', loanType: 'Business instalment loan',
    overdueAmount: 18500, daysPastDue: 18, language: 'Hinglish', owner: 'Ananya Rao',
    createdAt: now, updatedAt: now, synthetic: true, sourceRevision: 1,
    status: 'unreviewed', analyses: [], proposals: [], decisions: [], audit: [],
    ...details,
    source: { transcript: parseTranscript(transcript), collectorNote, policy: structuredClone(demoPolicy), directory: structuredClone(directory) },
  };
}

export function seedCases(): CaseRecord[] {
  return [
    fixture('CR-1001', { customer: 'Ravi Mehta', business: 'Mehta Printworks', loanId: 'DEMO-LN-4821' },
`[00:00] Collector: Namaste Ravi ji, main Demo Bank collections se Amit bol raha hoon. Aapki instalment ke baare mein baat karni thi.
[00:08] Customer: Haan, lekin amount galat lag raha hai. Mere hisaab se 15,000 due hai, 18,500 nahi.
[00:17] Collector: System mein 18,500 dikh raha hai. Kya aap Friday, 2 October tak pay kar denge?
[00:25] Customer: Nahi, pehle charges ka breakup bhejiye. Jab tak amount clear nahi hota, main payment ka promise nahi kar sakta.
[00:36] Collector: Aap filhaal 5,000 amit.collect@personal-pay par transfer kar dijiye, baaki baad mein dekh lenge.
[00:46] Customer: Yeh bank ka payment address hai? Mujhe official bank link chahiye.
[00:53] Collector: Isi address par bhej dijiye, main update kar doonga.
[01:00] Customer: Main abhi kuch transfer nahi kar raha. Please statement aur official payment details bhejiye.`,
      'Customer confirmed a promise to pay INR 18,500 by Friday, 2 October 2026. Customer agreed to make an immediate INR 5,000 part-payment. No dispute raised.'),
    fixture('CR-1002', { customer: 'Nisha Shah', business: 'Nisha Foods', loanId: 'DEMO-LN-5107', overdueAmount: 9200, daysPastDue: 8, language: 'English' },
`[00:00] Collector: Hello Ms Shah, this is Leena from Demo Bank collections. Is this a convenient time to discuss your overdue instalment?
[00:08] Customer: Yes, I can speak now.
[00:12] Collector: Our statement shows INR 9,200 overdue. Would you like me to send the statement before we discuss repayment?
[00:22] Customer: I have the statement and the amount is correct. I will pay INR 9,200 by 2 October 2026.
[00:33] Collector: Thank you. Please use the official payment destination collections@demo-bank. Do not share your PIN or OTP with anyone.
[00:44] Customer: Understood. I will use that official address.
[00:50] Collector: I will record your commitment for 2 October. Please contact the bank if your circumstances change.`,
      'Customer explicitly confirmed INR 9,200 and committed to paying by 2 October 2026. Official destination collections@demo-bank was provided. Customer raised no amount dispute.'),
    fixture('CR-1003', { customer: 'Farah Khan', business: 'Farah Textiles', loanId: 'DEMO-LN-6340', overdueAmount: 12400, daysPastDue: 12 },
`[00:00] Collector: Farah ji, pichhli call mein jo payment discuss hua tha, uska update chahiye.
[00:08] Customer: Ho sakta hai Friday ko kuch arrange ho jaye, lekin abhi confirm nahi hai.
[00:17] Collector: Theek hai, main Friday ko phir check kar loonga. Pichhli call ka payment address aapke paas hai?
[00:25] Customer: Haan, message mila tha, lekin mujhe verify karna hai.
[00:31] Collector: Main statement aur verified details mangwata hoon.
[00:38] Customer: Theek hai.`,
      'Customer may be able to arrange funds on Friday; no confirmed amount or payment commitment. Follow up after sending the statement. Payment details were discussed on a previous call; that recording and message are not attached.',
      { version: 'Not supplied', available: false, complete: false, destinations: [] }),
  ];
}
