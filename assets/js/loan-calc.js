// ============================================================
// TUKNBD - Loan Calculator (Single Source of Truth)
// ফাইল: assets/js/loan-calc.js
// ------------------------------------------------------------
// নিয়ম A (আপনার প্রতিষ্ঠানের নিয়ম):
//   • লভ্যাংশ + সার্ভিস চার্জ = এককালীন (লোন নেওয়ার আগে)
//   • EMI = শুধু মূল ÷ কিস্তি সংখ্যা
//   • মোট পরিশোধ্য = মূল + লভ্যাংশ + সার্ভিস
//
// ব্যবহার:
//   LoanCalc.calculate(10000, 12, 'monthly')
//   LoanCalc.getDueDate(startDate, 3, 'monthly')
//   LoanCalc.calculateLateFee(emiAmount, 2, dueDate, 5, 0)
// ============================================================

(function (global) {
    'use strict';

    const LoanCalc = {

        // ------------------------------------------------------------
        // ১. লভ্যাংশের হার (মেয়াদ অনুযায়ী)
        // ------------------------------------------------------------
        getProfitRate(durationMonths, loanType = null) {
            const months = Number(durationMonths) || 12;

            // ভবিষ্যতে লোন-টাইপ ভিত্তিক হার দরকার হলে এখানে যোগ করুন
            // if (loanType === 'শিক্ষা লোন' && months <= 6) return 8;

            if (months <= 6) return 10;
            if (months <= 12) return 12;
            return 15;
        },

        // ------------------------------------------------------------
        // ২. কিস্তির সংখ্যা (installment_type অনুযায়ী)
        // ------------------------------------------------------------
        getInstallmentCount(durationMonths, type = 'monthly') {
            const months = Number(durationMonths) || 12;
            switch (type) {
                case 'weekly':      return Math.round(months * 4.33);   // ~52 সপ্তাহ / বছর
                case 'monthly':     return months;
                case 'quarterly':   return Math.ceil(months / 3);
                case 'half_yearly': return Math.ceil(months / 6);
                case 'yearly':      return Math.ceil(months / 12);
                default:            return months;
            }
        },

        // ------------------------------------------------------------
        // ৩. মূল হিসাব — একমাত্র এখানেই হবে
        // ------------------------------------------------------------
        calculate(amount, durationMonths, installmentType = 'monthly', loanType = null) {
            const principal = Math.max(0, Number(amount) || 0);
            const months    = Math.max(1, Number(durationMonths) || 12);

            const profitRate    = this.getProfitRate(months, loanType);
            const profitAmount  = Math.round((principal * profitRate / 100) * 100) / 100;
            const serviceCharge = Math.round((principal * 1 / 100) * 100) / 100;
            const totalAmount   = Math.round((principal + profitAmount + serviceCharge) * 100) / 100;

            const installmentCount = this.getInstallmentCount(months, installmentType);
            const emi = installmentCount > 0
                ? Math.round((principal / installmentCount) * 100) / 100
                : 0;

            return {
                principal,          // মূল লোন
                profitRate,         // লভ্যাংশের হার (%)
                profitAmount,       // লভ্যাংশের টাকা
                serviceCharge,      // সার্ভিস চার্জ
                upfrontAmount: Math.round((profitAmount + serviceCharge) * 100) / 100, // প্রথমে দিতে হবে
                totalAmount,        // মোট পরিশোধ্য (মূল + লভ্যাংশ + সার্ভিস)
                durationMonths: months,
                installmentType,
                installmentCount,   // মোট কিস্তির সংখ্যা
                emi                 // প্রতি কিস্তি (শুধু মূল ÷ count)
            };
        },

        // ------------------------------------------------------------
        // ৪. কিস্তির dueDate — কিস্তির ধরন অনুযায়ী
        // ------------------------------------------------------------
        getDueDate(startDate, installmentNo, type = 'monthly') {
            const d = new Date(startDate);
            const n = Number(installmentNo) || 1;

            switch (type) {
                case 'weekly':      d.setDate(d.getDate() + n * 7); break;
                case 'monthly':     d.setMonth(d.getMonth() + n); break;
                case 'quarterly':   d.setMonth(d.getMonth() + n * 3); break;
                case 'half_yearly': d.setMonth(d.getMonth() + n * 6); break;
                case 'yearly':      d.setFullYear(d.getFullYear() + n); break;
                default:            d.setMonth(d.getMonth() + n);
            }
            d.setHours(0, 0, 0, 0);
            return d;
        },

        // ------------------------------------------------------------
        // ৫. বিলম্ব ফি — একবার হিসাব (নিয়ম: মাসিক হার একবার গুণ)
        // ------------------------------------------------------------
        calculateLateFee(emiAmount, lateFeePercent, dueDate, graceDays = 5, waiverAmount = 0) {
            const due = new Date(dueDate);
            due.setHours(0, 0, 0, 0);

            const graceEnd = new Date(due);
            graceEnd.setDate(due.getDate() + Number(graceDays || 0));

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (today > graceEnd) {
                const raw = Number(emiAmount) * (Number(lateFeePercent) / 100);
                const effective = Math.max(0, raw - Number(waiverAmount || 0));
                return Math.round(effective * 100) / 100;
            }
            return 0;
        },

        // ------------------------------------------------------------
        // ৬. সহায়ক: পুরো EMI schedule তৈরি (দরকার হলে)
        // ------------------------------------------------------------
        buildSchedule(options) {
            const {
                amount,
                durationMonths,
                installmentType = 'monthly',
                loanType = null,
                startDate = new Date(),
                lateFeePercent = 0,
                graceDays = 5,
                payments = []   // DB থেকে আসা payment rows (installment_no অনুযায়ী)
            } = options || {};

            const details = this.calculate(amount, durationMonths, installmentType, loanType);
            const paymentMap = {};
            (payments || []).forEach(p => { paymentMap[p.installment_no] = p; });

            const schedule = [];
            for (let i = 1; i <= details.installmentCount; i++) {
                const dueDate = this.getDueDate(startDate, i, installmentType);
                const payment = paymentMap[i] || null;

                let status = 'pending';
                let lateFee = 0;
                let isPaid = false;
                let isWaived = false;
                let isLocked = false;

                if (payment) {
                    status  = payment.status || 'pending';
                    lateFee = Number(payment.late_fee) || 0;
                    isWaived = payment.installment_waived === true;
                    isLocked = payment.late_fee_locked === true;
                    if (status === 'approved' || status === 'paid') isPaid = true;
                }

                if (!isPaid && !isWaived && !isLocked && status !== 'pending_verification') {
                    lateFee = this.calculateLateFee(
                        details.emi,
                        lateFeePercent,
                        dueDate,
                        graceDays,
                        payment?.late_fee_waived || 0
                    );
                }

                schedule.push({
                    installmentNo: i,
                    dueDate,
                    emiAmount: details.emi,
                    lateFee,
                    totalAmount: Math.round((details.emi + lateFee) * 100) / 100,
                    status,
                    isPaid,
                    isWaived,
                    isLocked,
                    payment
                });
            }

            return { details, schedule };
        },

        // ------------------------------------------------------------
        // ৭. যাচাই: ইনপুট সঠিক কিনা
        // ------------------------------------------------------------
        validate(amount, durationMonths, installmentType = 'monthly') {
            const errors = [];
            if (!amount || Number(amount) < 1000) errors.push('লোনের পরিমাণ ন্যূনতম ১০০০ টাকা হতে হবে');
            if (!durationMonths || Number(durationMonths) < 1) errors.push('মেয়াদ কমপক্ষে ১ মাস হতে হবে');
            if (!['weekly', 'monthly', 'quarterly', 'half_yearly', 'yearly'].includes(installmentType)) {
                errors.push('কিস্তির ধরন সঠিক নয়');
            }
            return { valid: errors.length === 0, errors };
        }
    };

    // গ্লোবাল অ্যাক্সেস
    global.LoanCalc = LoanCalc;

    // CommonJS/ESM fallback (ভবিষ্যতের জন্য)
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = LoanCalc;
    }

})(typeof window !== 'undefined' ? window : globalThis);
