"""Regenerate the two-page English CV from data/profile.json; requires reportlab."""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable

ROOT = Path(__file__).resolve().parents[1]
p = json.loads((ROOT / 'data/profile.json').read_text())
OUTPUT = ROOT / 'static/uploads/resume.pdf'
ACCENT, INK, MUTED, LINE = [colors.HexColor(x) for x in ['#284BDF', '#20251F', '#62675E', '#D9DBD1']]
WIDTH = A4[0] - 104

def text(value):
    return escape(str(value).replace('–', '-').replace('—', '-').replace('·', '|'))

styles = {
    'name': ParagraphStyle('name', fontName='Times-Roman', fontSize=34, leading=37, textColor=INK),
    'role': ParagraphStyle('role', fontName='Helvetica', fontSize=10, leading=15, textColor=INK),
    'contact': ParagraphStyle('contact', fontName='Helvetica', fontSize=8.5, leading=13, textColor=MUTED),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=9.1, leading=13.2, textColor=MUTED),
    'small': ParagraphStyle('small', fontName='Helvetica', fontSize=8.3, leading=11.8, textColor=MUTED),
    'title': ParagraphStyle('title', fontName='Helvetica-Bold', fontSize=9.6, leading=13.2, textColor=INK),
    'date': ParagraphStyle('date', fontName='Helvetica', fontSize=8.3, leading=13.2, textColor=MUTED, alignment=TA_RIGHT),
    'section': ParagraphStyle('section', fontName='Times-Roman', fontSize=16, leading=20, textColor=ACCENT, keepWithNext=True),
}

def para(s, style='body'):
    return Paragraph(s, styles[style])

def hyperlink(url, label):
    return f'<a href="{escape(url, {chr(34): "&quot;"})}" color="#284BDF">{text(label)}</a>'

def section(title):
    return [Spacer(1, 13), para(text(title), 'section'), Spacer(1, 3), HRFlowable(width='100%', thickness=.5, color=LINE), Spacer(1, 9)]

def title_row(title, dates):
    table = Table([[para(text(title), 'title'), para(text(dates), 'date')]], colWidths=[WIDTH - 113, 113])
    table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
    return table

def entry(e, compact=False):
    return KeepTogether([title_row(e['title'], e['dates']), Spacer(1, 2), para(text(e['organization']) + (f" | {text(e['role'])}" if e.get('role') else ''), 'small'), Spacer(1, 3), para(text(e['description']), 'small' if compact else 'body'), Spacer(1, 9)])

story = [para('Zhike Peng<font color="#284BDF">.</font>', 'name'), Spacer(1, 5), para(text(p['role']) + ' | Tsinghua University', 'role'), Spacer(1, 4), para(' &nbsp; | &nbsp; '.join([hyperlink('mailto:' + p['email'], p['email']), hyperlink(p['website'], 'zhikepeng.github.io'), hyperlink(p['github'], 'GitHub')]), 'contact'), Spacer(1, 11), HRFlowable(width='100%', thickness=1, color=ACCENT), Spacer(1, 10), para('<b>Research interests.</b> ' + text(p['interests']))]
story += section('Education')
for e in p['education']:
    story.append(KeepTogether([title_row(e['institution'] + ' | ' + e['unit'], e['dates']), Spacer(1, 2), para(text(e['degree']), 'body'), para(text(e['detail']), 'small'), Spacer(1, 8)]))
story += section('Publications')
for pub in p['publications']:
    authors = ', '.join(f'<b>{text(a)}</b>' if a == p['name'] else text(a) for a in pub['authors'])
    story.append(KeepTogether([para(hyperlink(pub['links'][0]['url'], pub['title']), 'title'), Spacer(1, 3), para(authors + '.', 'small'), para(f'<b>{text(pub["venue"])}</b> | {text(pub["status"])}', 'body'), Spacer(1, 3), para(' &nbsp; | &nbsp; '.join(hyperlink(l['url'], l['label']) for l in pub['links']), 'small'), Spacer(1, 9)]))
story += section('Research experience')
for e in p['research']:
    story.append(entry(e, compact=True))
story.append(PageBreak())
story += section('Industry experience')
for e in p['industry']:
    story.append(entry(e))
story += section('Honors & awards')
honors = Table([[para(text(h['year']), 'small'), para(f'<b>{text(h["title"])}</b> | {text(h["detail"])}', 'small')] for h in p['honors']], colWidths=[39, WIDTH - 39])
honors.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING', (0,0), (-1,-1), 0), ('RIGHTPADDING', (0,0), (-1,-1), 0), ('TOPPADDING', (0,0), (-1,-1), 0), ('BOTTOMPADDING', (0,0), (-1,-1), 5)]))
story.extend([honors, Spacer(1, 5), para('Tsinghua University: Comprehensive Excellence Scholarship (2024, 2025); Social Work Scholarship (2023).', 'small')])
story += section('Leadership & service')
for e in p['service']:
    story.append(entry(e, compact=True))
story += section('Community engagement')
for e in p['outreach']:
    story.append(KeepTogether([para(f'<b>{text(e["date"])} | {text(e["location"])}</b> - {text(e["text"])}', 'small'), Spacer(1, 6)]))

def furniture(canvas, doc):
    canvas.saveState()
    if doc.page > 1:
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(46, A4[1] - 35, 'ZHIKE PENG / CURRICULUM VITAE')
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(.5)
        canvas.line(46, A4[1] - 43, A4[0] - 46, A4[1] - 43)
    canvas.setFillColor(MUTED)
    canvas.setFont('Helvetica', 7.5)
    canvas.drawString(46, 28, 'Zhike Peng | Updated ' + p['updated'])
    canvas.drawRightString(A4[0] - 46, 28, str(doc.page))
    canvas.restoreState()

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=46, rightMargin=46, topMargin=51, bottomMargin=44, title='Zhike Peng - Curriculum Vitae', author='Zhike Peng', subject='Academic curriculum vitae, October 2026')
doc.build(story, onFirstPage=furniture, onLaterPages=furniture)
print('Created ' + str(OUTPUT))
