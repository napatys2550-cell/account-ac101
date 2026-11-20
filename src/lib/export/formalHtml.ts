import {
  ACCOUNT_TYPE_LABELS,
  ACC,
  BOOKS,
  BOOK_ORDER,
  accountName,
  balanceOf,
  buildBalanceSheet,
  buildGeneralLedger,
  buildMerchStatement,
  buildSubLedger,
  buildTrialBalance,
  partyName,
  reconcile,
  sortEntries,
} from '@/lib/accounting'
import {
  formatDateLong,
  formatDateShort,
  formatMoney,
  formatPeriodLabel,
  formatTimestamp,
  periodEnd,
} from '@/lib/format'
import { DOC_KIND_LABELS, type ExportDataset, type ExportOptions } from './types'

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)

function letterheadBlock(companyName: string, businessType: string, title: string, subtitle: string, show: boolean) {
  if (!show) {
    return `<div class="doc-head-min"><h1>${esc(title)}</h1><div class="sub">${esc(subtitle)}</div></div>`
  }
  return `
    <div class="letterhead">
      <div class="co-name">${esc(companyName)}</div>
      <div class="co-type">${esc(businessType)}</div>
      <h1>${esc(title)}</h1>
      <div class="period-line">${esc(subtitle)}</div>
      <div class="unit-line">หน่วย : บาท</div>
    </div>`
}

function signatureBlock(opts: ExportOptions) {
  if (!opts.signature) return ''
  return `
    <div class="sig-grid">
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-role">( ${esc(opts.preparedBy || 'ผู้จัดทำ')} )</div>
        <div class="sig-label">ผู้จัดทำบัญชี · วันที่ ........ / ........ / ............</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div class="sig-role">( ${esc(opts.approvedBy || 'ผู้สอบทาน / เจ้าของกิจการ')} )</div>
        <div class="sig-label">ผู้สอบทาน / ผู้อนุมัติ · วันที่ ........ / ........ / ............</div>
      </div>
    </div>`
}

/**
 * สร้างเอกสาร HTML รายงานบัญชีแบบทางการ (ใช้ทั้งพรีวิว ดาวน์โหลด HTML และสั่งพิมพ์/บันทึกเป็น PDF แบบ Vector คมชัด)
 */
export function buildFormalHtml(data: ExportDataset, opts: ExportOptions): string {
  const { company, accounts, parties, entries } = data
  const end = periodEnd(company.period)
  const pLabel = formatPeriodLabel(company.period)
  const gl = buildGeneralLedger(entries, accounts, { upto: end, includeClosing: opts.includeClosing })
  const tb = buildTrialBalance(gl, accounts)
  const merch = buildMerchStatement(entries, accounts, company.period)
  const bs = buildBalanceSheet(entries, accounts, end, company.owner)
  const ar = reconcile(gl, entries, parties, 'debtor', { upto: end })
  const ap = reconcile(gl, entries, parties, 'creditor', { upto: end })

  const want = (k: ExportOptions['kind']) => opts.kind === 'packet' || opts.kind === k
  const sections: string[] = []

  // 1. งบทดลอง
  if (want('trial')) {
    const statusText = tb.balanced
      ? `งบทดลองสมดุล — เดบิต = เครดิต = ${formatMoney(tb.totalDr)} บาท`
      : `แจ้งเตือน: งบทดลองไม่สมดุล — ผลต่าง ${formatMoney(Math.abs(tb.diff))} บาท`
    sections.push(`
      <section class="report-sec">
        ${letterheadBlock(company.name, company.businessType, 'งบทดลอง', `ณ วันที่ ${formatDateLong(end)}`, opts.letterhead)}
        <div class="status-pill ${tb.balanced ? 'ok' : 'bad'}">${esc(statusText)}</div>
        <table class="formal">
          <thead>
            <tr>
              <th style="width:14%">เลขที่บัญชี</th>
              <th>ชื่อบัญชี</th>
              <th class="num" style="width:20%">เดบิต</th>
              <th class="num" style="width:20%">เครดิต</th>
            </tr>
          </thead>
          <tbody>
            ${tb.rows
              .map(
                (r) => `<tr>
                  <td class="mono">${esc(r.code)}</td>
                  <td>${esc(r.name)}</td>
                  <td class="num">${r.dr ? formatMoney(r.dr) : ''}</td>
                  <td class="num">${r.cr ? formatMoney(r.cr) : ''}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2">รวมทั้งสิ้น</td>
              <td class="num">${formatMoney(tb.totalDr)}</td>
              <td class="num">${formatMoney(tb.totalCr)}</td>
            </tr>
          </tfoot>
        </table>
      </section>`)
  }

  // 2. งบกำไรขาดทุน
  if (want('income')) {
    const r = (label: string, val: number, cls = '') =>
      `<tr><td class="${cls}">${esc(label)}</td><td class="num ${val < 0 ? 'neg' : ''}">${formatMoney(val)}</td></tr>`
    const sub = (label: string, val: number) =>
      `<tr class="subtotal"><td>${esc(label)}</td><td class="num">${formatMoney(val)}</td></tr>`
    sections.push(`
      <section class="report-sec">
        ${letterheadBlock(
          company.name,
          company.businessType,
          'งบกำไรขาดทุน (แบบหลายขั้นตอน)',
          `สำหรับงวด 1 เดือน สิ้นสุดวันที่ ${formatDateLong(end)}`,
          opts.letterhead,
        )}
        <table class="formal">
          <thead>
            <tr><th>รายการ</th><th class="num" style="width:24%">จำนวนเงิน</th></tr>
          </thead>
          <tbody>
            <tr class="group-hd"><td colspan="2">รายได้จากการขาย</td></tr>
            ${r('ขายสินค้า', merch.sales, 'ind1')}
            ${r('หัก รับคืนสินค้าขาย', -merch.sret, 'ind2')}
            ${r('หัก ส่วนลดจ่าย', -merch.sdisc, 'ind2')}
            ${sub('ยอดขายสุทธิ', merch.netSales)}
            <tr class="group-hd"><td colspan="2">ต้นทุนขายสินค้า (วิธีสิ้นงวด Periodic)</td></tr>
            ${r('สินค้าคงเหลือต้นงวด', merch.beg, 'ind1')}
            ${r('ซื้อสินค้า', merch.purch, 'ind1')}
            ${r('หัก ส่งคืนสินค้าซื้อ', -merch.pret, 'ind2')}
            ${r('หัก ส่วนลดรับ', -merch.pdisc, 'ind2')}
            ${r('ซื้อสุทธิ', merch.netPurch, 'ind1')}
            ${r('บวก ค่าขนส่งเข้า', merch.fin, 'ind1')}
            ${r('สินค้าที่มีไว้เพื่อขาย', merch.available, 'ind1')}
            ${r('หัก สินค้าคงเหลือปลายงวด', -merch.ending, 'ind2')}
            ${sub('ต้นทุนขาย', merch.cogs)}
            ${sub('กำไรขั้นต้น', merch.gross)}
            <tr class="group-hd"><td colspan="2">ค่าใช้จ่ายในการขาย</td></tr>
            ${merch.sell.map((x) => r(x.name, x.amount, 'ind1')).join('')}
            ${sub('รวมค่าใช้จ่ายในการขาย', merch.sellTotal)}
            <tr class="group-hd"><td colspan="2">ค่าใช้จ่ายในการบริหาร</td></tr>
            ${merch.admin.map((x) => r(x.name, x.amount, 'ind1')).join('')}
            ${sub('รวมค่าใช้จ่ายในการบริหาร', merch.adminTotal)}
            ${sub('กำไรจากการดำเนินงาน', merch.operating)}
            ${r('บวก รายได้อื่น', merch.other, 'ind1')}
          </tbody>
          <tfoot>
            <tr><td>กำไรสุทธิประจำงวด</td><td class="num">${formatMoney(merch.netIncome)}</td></tr>
          </tfoot>
        </table>
      </section>`)
  }

  // 3. งบแสดงฐานะการเงิน
  if (want('balance')) {
    sections.push(`
      <section class="report-sec">
        ${letterheadBlock(company.name, company.businessType, 'งบแสดงฐานะการเงิน', `ณ วันที่ ${formatDateLong(end)}`, opts.letterhead)}
        <table class="formal">
          <thead><tr><th>รายการ</th><th class="num" style="width:24%">จำนวนเงิน</th></tr></thead>
          <tbody>
            <tr class="group-hd"><td colspan="2">สินทรัพย์</td></tr>
            ${bs.assets.map((a) => `<tr><td class="ind1">${esc(a.code)} ${esc(a.name)}</td><td class="num">${formatMoney(a.amount)}</td></tr>`).join('')}
            <tr class="grand-sub"><td>รวมสินทรัพย์</td><td class="num">${formatMoney(bs.totalAssets)}</td></tr>
            <tr class="group-hd"><td colspan="2">หนี้สิน</td></tr>
            ${bs.liabilities.map((l) => `<tr><td class="ind1">${esc(l.code)} ${esc(l.name)}</td><td class="num">${formatMoney(l.amount)}</td></tr>`).join('')}
            <tr class="subtotal"><td>รวมหนี้สิน</td><td class="num">${formatMoney(bs.totalLiabilities)}</td></tr>
            <tr class="group-hd"><td colspan="2">ส่วนของเจ้าของ</td></tr>
            ${bs.equity.map((eq) => `<tr><td class="ind1">${esc(eq.name)}</td><td class="num">${formatMoney(eq.amount)}</td></tr>`).join('')}
            <tr class="subtotal"><td>รวมส่วนของเจ้าของ</td><td class="num">${formatMoney(bs.totalEquity)}</td></tr>
          </tbody>
          <tfoot>
            <tr><td>รวมหนี้สินและส่วนของเจ้าของ</td><td class="num">${formatMoney(bs.totalLiabilities + bs.totalEquity)}</td></tr>
          </tfoot>
        </table>
      </section>`)
  }

  // 4. สมุดรายวัน 5 เล่ม
  if (want('journals')) {
    for (const book of BOOK_ORDER) {
      const list = sortEntries(entries).filter((e) => e.book === book && (opts.includeClosing || !e.closing))
      const sumDr = list.reduce((s, e) => s + e.lines.reduce((x, l) => x + l.dr, 0), 0)
      const sumCr = list.reduce((s, e) => s + e.lines.reduce((x, l) => x + l.cr, 0), 0)
      sections.push(`
        <section class="report-sec">
          ${letterheadBlock(company.name, company.businessType, BOOKS[book].name, `งวดเดือน ${pLabel} (${list.length} รายการ)`, opts.letterhead)}
          <table class="formal">
            <thead>
              <tr>
                <th style="width:13%">วันที่</th>
                <th style="width:11%">เลขที่</th>
                <th>รายละเอียด / บัญชี</th>
                <th class="num" style="width:16%">เดบิต</th>
                <th class="num" style="width:16%">เครดิต</th>
              </tr>
            </thead>
            <tbody>
              ${
                list.length
                  ? list
                      .map((e) =>
                        e.lines
                          .map(
                            (l, idx) => `<tr>
                              <td>${idx === 0 ? esc(formatDateShort(e.date)) : ''}</td>
                              <td class="mono">${idx === 0 ? esc(e.docNo) : ''}</td>
                              <td>
                                ${idx === 0 ? `<div class="e-desc">${esc(e.description)}</div>` : ''}
                                <div class="${l.cr > 0 ? 'ind2' : 'ind1'}">${esc(l.account)} ${esc(accountName(accounts, l.account))}${l.partyId ? ` (${esc(partyName(parties, l.partyId))})` : ''}</div>
                              </td>
                              <td class="num">${l.dr ? formatMoney(l.dr) : ''}</td>
                              <td class="num">${l.cr ? formatMoney(l.cr) : ''}</td>
                            </tr>`,
                          )
                          .join(''),
                      )
                      .join('')
                  : `<tr><td colspan="5" style="text-align:center;color:#666">ไม่มีรายการในสมุดเล่มนี้</td></tr>`
              }
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3">รวมยอด${esc(BOOKS[book].name)}</td>
                <td class="num">${formatMoney(sumDr)}</td>
                <td class="num">${formatMoney(sumCr)}</td>
              </tr>
            </tfoot>
          </table>
        </section>`)
    }
  }

  // 5. ทะเบียนรายการค้าทั้งหมด (พร้อมเหตุผลการเลือกสมุด)
  if (want('entries')) {
    const list = sortEntries(entries).filter((e) => opts.includeClosing || !e.closing)
    const sumDr = list.reduce((s, e) => s + e.lines.reduce((x, l) => x + l.dr, 0), 0)
    const sumCr = list.reduce((s, e) => s + e.lines.reduce((x, l) => x + l.cr, 0), 0)
    sections.push(`
      <section class="report-sec">
        ${letterheadBlock(company.name, company.businessType, 'ทะเบียนรายการค้าทั้งหมด (พร้อมเหตุผลการเลือกสมุด)', `งวดเดือน ${pLabel} · ${list.length} รายการ`, opts.letterhead)}
        <table class="formal">
          <thead>
            <tr>
              <th style="width:11%">วันที่</th>
              <th style="width:10%">เลขที่</th>
              <th style="width:15%">สมุดรายวัน</th>
              <th>รายละเอียดและเหตุผลการเลือกสมุด</th>
              <th class="num" style="width:14%">เดบิต</th>
              <th class="num" style="width:14%">เครดิต</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map((e) => {
                const d = e.lines.reduce((s, l) => s + l.dr, 0)
                const c = e.lines.reduce((s, l) => s + l.cr, 0)
                return `<tr>
                  <td>${esc(formatDateShort(e.date))}</td>
                  <td class="mono">${esc(e.docNo)}</td>
                  <td>${esc(BOOKS[e.book].shortName)}</td>
                  <td>
                    <div class="e-desc">${esc(e.description)}</div>
                    <div class="reason">เหตุผล: ${esc(e.reason || '-')}</div>
                  </td>
                  <td class="num">${formatMoney(d)}</td>
                  <td class="num">${formatMoney(c)}</td>
                </tr>`
              })
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="4">รวมทั้งสิ้น</td>
              <td class="num">${formatMoney(sumDr)}</td>
              <td class="num">${formatMoney(sumCr)}</td>
            </tr>
          </tfoot>
        </table>
      </section>`)
  }

  // 6. บัญชีแยกประเภททั่วไป
  if (want('ledger')) {
    const blocks = Object.keys(gl)
      .sort()
      .map((code) => {
        let running = 0
        const rows = gl[code]
          .map((p) => {
            running += p.dr - p.cr
            return `<tr>
              <td>${esc(formatDateShort(p.date))}</td>
              <td>${esc(p.description)}</td>
              <td class="mono">${esc(p.ref)}</td>
              <td class="num">${p.dr ? formatMoney(p.dr) : ''}</td>
              <td class="num">${p.cr ? formatMoney(p.cr) : ''}</td>
              <td class="num">${formatMoney(Math.abs(running))} ${running < 0 ? 'คร.' : 'เด.'}</td>
            </tr>`
          })
          .join('')
        const bal = balanceOf(gl[code])
        return `
          <div class="gl-box">
            <h3>บัญชี ${esc(code)} — ${esc(accountName(accounts, code))}</h3>
            <table class="formal">
              <thead>
                <tr>
                  <th style="width:14%">วันที่</th>
                  <th>รายการ</th>
                  <th style="width:11%">หน้าบัญชี</th>
                  <th class="num" style="width:15%">เดบิต</th>
                  <th class="num" style="width:15%">เครดิต</th>
                  <th class="num" style="width:17%">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
              <tfoot>
                <tr>
                  <td colspan="3">ยอดคงเหลือปลายงวด</td>
                  <td class="num">${bal > 0 ? formatMoney(bal) : ''}</td>
                  <td class="num">${bal < 0 ? formatMoney(-bal) : ''}</td>
                  <td class="num">${formatMoney(Math.abs(bal))} ${bal < 0 ? 'คร.' : 'เด.'}</td>
                </tr>
              </tfoot>
            </table>
          </div>`
      })
      .join('')
    sections.push(`
      <section class="report-sec">
        ${letterheadBlock(company.name, company.businessType, 'บัญชีแยกประเภททั่วไป (General Ledger)', `ณ วันที่ ${formatDateLong(end)}`, opts.letterhead)}
        ${blocks}
      </section>`)
  }

  // 7. บัญชีย่อยลูกหนี้และเจ้าหนี้
  if (want('subledger')) {
    const renderSub = (kindParty: 'debtor' | 'creditor', title: string, rec: typeof ar) => {
      const sub = buildSubLedger(entries, kindParty, { upto: end })
      const sign = kindParty === 'debtor' ? 1 : -1
      const partyTables = rec.parties
        .map(({ party, balance }) => {
          const list = sub[party.id] ?? []
          let running = 0
          return `
            <div class="gl-box">
              <h3>${esc(party.id)} · ${esc(party.name)} <span style="font-weight:400;color:#555">(เงื่อนไข ${esc(party.terms)})</span></h3>
              <table class="formal">
                <thead>
                  <tr>
                    <th style="width:14%">วันที่</th>
                    <th>รายการ</th>
                    <th style="width:11%">หน้าบัญชี</th>
                    <th class="num" style="width:16%">เดบิต</th>
                    <th class="num" style="width:16%">เครดิต</th>
                    <th class="num" style="width:17%">คงเหลือ</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    list.length
                      ? list
                          .map((p) => {
                            running += sign * (p.dr - p.cr)
                            return `<tr>
                              <td>${esc(formatDateShort(p.date))}</td>
                              <td>${esc(p.description)}</td>
                              <td class="mono">${esc(p.ref)}</td>
                              <td class="num">${p.dr ? formatMoney(p.dr) : ''}</td>
                              <td class="num">${p.cr ? formatMoney(p.cr) : ''}</td>
                              <td class="num">${formatMoney(running)}</td>
                            </tr>`
                          })
                          .join('')
                      : `<tr><td colspan="6" style="text-align:center;color:#666">ไม่มีรายการเคลื่อนไหว</td></tr>`
                  }
                </tbody>
                <tfoot>
                  <tr><td colspan="5">ยอดคงเหลือ ณ สิ้นงวด</td><td class="num">${formatMoney(balance)}</td></tr>
                </tfoot>
              </table>
            </div>`
        })
        .join('')
      return `
        <section class="report-sec">
          ${letterheadBlock(company.name, company.businessType, title, `ณ วันที่ ${formatDateLong(end)}`, opts.letterhead)}
          <div class="status-pill ${rec.ok ? 'ok' : 'bad'}">
            รวมบัญชีย่อย ${formatMoney(rec.subTotal)} บาท · บัญชีคุม (${kindParty === 'debtor' ? ACC.AR : ACC.AP}) ${formatMoney(rec.control)} บาท — ${rec.ok ? 'กระทบยอดตรงกัน ✓' : `ไม่ตรงกัน (ผลต่าง ${formatMoney(Math.abs(rec.diff))})`}
          </div>
          ${partyTables}
        </section>`
    }
    sections.push(renderSub('debtor', 'บัญชีแยกประเภทย่อยลูกหนี้การค้า', ar))
    sections.push(renderSub('creditor', 'บัญชีแยกประเภทย่อยเจ้าหนี้การค้า', ap))
  }

  // 8. ผังบัญชี
  if (want('accounts')) {
    sections.push(`
      <section class="report-sec">
        ${letterheadBlock(company.name, company.businessType, 'ผังบัญชีกิจการซื้อมาขายไป', `จำนวนทั้งหมด ${accounts.length} บัญชี`, opts.letterhead)}
        <table class="formal">
          <thead>
            <tr>
              <th style="width:14%">เลขที่บัญชี</th>
              <th>ชื่อบัญชี</th>
              <th style="width:18%">หมวดบัญชี</th>
              <th style="width:13%">ด้านปกติ</th>
              <th style="width:24%">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            ${accounts
              .map(
                (a) => `<tr>
                  <td class="mono">${esc(a.code)}</td>
                  <td>${esc(a.name)}</td>
                  <td>${esc(ACCOUNT_TYPE_LABELS[a.type])}</td>
                  <td>${a.normal === 'dr' ? 'เดบิต' : 'เครดิต'}</td>
                  <td>${esc(a.note ?? '-')}</td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </section>`)
  }

  const pageSize = `${opts.paper === 'letter' ? 'Letter' : 'A4'} ${opts.landscape ? 'landscape' : 'portrait'}`

  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(DOC_KIND_LABELS[opts.kind])} · ${esc(company.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  @page { size: ${pageSize}; margin: 14mm 15mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0 auto;
    padding: 24px 28px;
    max-width: ${opts.landscape ? '1060px' : '820px'};
    font-family: 'Sarabun', 'TH Sarabun New', 'Leelawadee UI', Tahoma, sans-serif;
    font-size: 14px;
    line-height: 1.55;
    color: #111827;
    background: #ffffff;
  }
  .report-sec { margin-bottom: 32px; }
  .report-sec + .report-sec { page-break-before: always; break-before: page; }
  .letterhead {
    text-align: center;
    padding-bottom: 10px;
    margin-bottom: 14px;
    border-bottom: 2px solid #111827;
    position: relative;
  }
  .co-name { font-size: 17px; font-weight: 700; letter-spacing: 0.2px; }
  .co-type { font-size: 12.5px; color: #4b5563; margin-bottom: 4px; }
  .letterhead h1 { font-size: 19px; font-weight: 700; margin: 2px 0; }
  .period-line { font-size: 13.5px; color: #374151; }
  .unit-line { text-align: right; font-size: 12px; color: #4b5563; margin-top: 4px; font-weight: 600; }
  .doc-head-min { text-align: center; margin-bottom: 12px; }
  .doc-head-min h1 { font-size: 18px; margin: 0; }
  .doc-head-min .sub { font-size: 13px; color: #4b5563; }
  .status-pill {
    font-size: 12.5px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 6px;
    margin-bottom: 12px;
    border: 1px solid;
  }
  .status-pill.ok { color: #166534; background: #f0fdf4; border-color: #bbf7d0; }
  .status-pill.bad { color: #991b1b; background: #fef2f2; border-color: #fecaca; }
  table.formal { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 13.5px; }
  table.formal thead { display: table-header-group; }
  table.formal tr { break-inside: avoid; page-break-inside: avoid; }
  table.formal th {
    background: #f3f4f6;
    color: #111827;
    font-weight: 700;
    text-align: left;
    padding: 7px 9px;
    border-top: 1.5px solid #111827;
    border-bottom: 1.5px solid #111827;
    font-size: 12.5px;
  }
  table.formal th.num, table.formal td.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  table.formal td { padding: 6px 9px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  table.formal tfoot td {
    font-weight: 700;
    padding: 8px 9px;
    border-top: 1.5px solid #111827;
    border-bottom: 3px double #111827;
    background: #ffffff;
  }
  tr.group-hd td { font-weight: 700; padding-top: 10px; background: #fafafa; }
  tr.subtotal td { font-weight: 700; border-top: 1px solid #9ca3af; }
  tr.grand-sub td { font-weight: 700; border-top: 1.5px solid #111827; border-bottom: 3px double #111827; }
  .ind1 { padding-left: 22px !important; }
  .ind2 { padding-left: 40px !important; color: #374151; }
  .neg { color: #374151; }
  .mono { font-family: 'IBM Plex Mono', Consolas, monospace; font-size: 12px; }
  .e-desc { font-weight: 600; }
  .reason { font-size: 12px; color: #4b5563; margin-top: 2px; }
  .gl-box { margin-bottom: 18px; break-inside: avoid; }
  .gl-box h3 { font-size: 14px; margin: 10px 0 6px; color: #111827; }
  .sig-grid {
    display: flex;
    justify-content: space-around;
    gap: 40px;
    margin-top: 42px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .sig-box { flex: 1; max-width: 280px; text-align: center; }
  .sig-line { border-bottom: 1px solid #374151; height: 34px; margin-bottom: 6px; }
  .sig-role { font-size: 13px; font-weight: 600; }
  .sig-label { font-size: 12px; color: #4b5563; margin-top: 2px; }
  footer.doc-foot {
    margin-top: 28px;
    padding-top: 8px;
    border-top: 1px solid #d1d5db;
    display: flex;
    justify-content: space-between;
    font-size: 11.5px;
    color: #6b7280;
  }
  @media print {
    body { padding: 0; max-width: none; }
    .status-pill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    table.formal th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  ${sections.join('\n')}
  ${signatureBlock(opts)}
  ${
    opts.footer
      ? `<footer class="doc-foot">
          <span>จัดทำโดยระบบบัญชีสมุดรายวันเฉพาะ · ${esc(company.name)}</span>
          <span>พิมพ์เมื่อ ${esc(formatTimestamp())}</span>
        </footer>`
      : ''
  }
</body>
</html>`
}
