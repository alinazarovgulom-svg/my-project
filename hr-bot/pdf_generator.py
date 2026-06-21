import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle, Image, HRFlowable
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus.flowables import KeepTogether

# ── Fonts ──────────────────────────────────────────────────────────────────────
_DIR = os.path.dirname(__file__)
try:
    pdfmetrics.registerFont(TTFont("DejaVu",     os.path.join(_DIR, "fonts", "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVu-Bold", os.path.join(_DIR, "fonts", "DejaVuSans-Bold.ttf")))
    F = "DejaVu"
    FB = "DejaVu-Bold"
except Exception:
    F, FB = "Helvetica", "Helvetica-Bold"

# ── Palette ────────────────────────────────────────────────────────────────────
NAVY   = colors.HexColor("#1B2E4B")
BLUE   = colors.HexColor("#2563EB")
LIGHT  = colors.HexColor("#EFF4FF")
STRIPE = colors.HexColor("#F8FAFC")
BORDER = colors.HexColor("#CBD5E1")
GREY   = colors.HexColor("#64748B")
WHITE  = colors.white

PAGE_W = A4[0] - 4*cm   # usable width


# ── Style helpers ──────────────────────────────────────────────────────────────
def _s(name, **kw):
    base = dict(fontName=F, fontSize=10, leading=15, textColor=NAVY)
    base.update(kw)
    return ParagraphStyle(name, **base)


TITLE   = _s("t",  fontName=FB, fontSize=22, textColor=WHITE, alignment=1, spaceAfter=2)
SUBT    = _s("st", fontSize=9,  textColor=colors.HexColor("#93C5FD"), alignment=1)
SEC     = _s("sc", fontName=FB, fontSize=11, textColor=BLUE, spaceBefore=14, spaceAfter=5)
NORMAL  = _s("n")
FOOTER  = _s("f",  fontSize=8,  textColor=GREY, alignment=1)
LABEL   = _s("lb", fontName=FB, fontSize=9,  textColor=GREY,    leading=13)
VALUE   = _s("vl", fontName=F,  fontSize=10, textColor=NAVY,    leading=14)


# ── Main generator ─────────────────────────────────────────────────────────────
def generate_pdf(data: dict, user) -> str:
    path = f"/tmp/anketa_{user.id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"

    doc = SimpleDocTemplate(
        path, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
        title="Ma'lumotnoma",
    )

    story = []

    # ── Hero banner ────────────────────────────────────────────────────────────
    story.append(_hero_banner(data))
    story.append(Spacer(1, 0.5*cm))

    # ── Personal info ──────────────────────────────────────────────────────────
    story.append(Paragraph("SHAXSIY MA'LUMOTLAR", SEC))
    story.append(_card([
        ("Ism, Familiya, Otasining ismi", data.get("full_name", "—")),
        ("Tug'ilgan sana",                data.get("birth_date", "—")),
        ("Tug'ilgan joy",                 data.get("birth_place", "—")),
        ("Oilaviy holati",                data.get("family_status", "—")),
        ("Turar manzil",                  data.get("address", "—")),
    ]))

    # ── Education ──────────────────────────────────────────────────────────────
    story.append(Paragraph("TA'LIM", SEC))
    story.append(_text_card(data.get("education", "—")))

    # ── Work experience ────────────────────────────────────────────────────────
    story.append(Paragraph("ISH TAJRIBASI", SEC))
    story.append(_text_card(data.get("work_experience", "—")))

    # ── Footer ─────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 0.8*cm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
    story.append(Spacer(1, 0.2*cm))
    tg = f"@{user.username}" if user.username else f"ID: {user.id}"
    story.append(Paragraph(
        f"Telegram orqali to'ldirildi · {tg} · {datetime.now().strftime('%d.%m.%Y %H:%M')}",
        FOOTER
    ))

    doc.build(story, onFirstPage=_page_bg, onLaterPages=_page_bg)

    # cleanup photo
    p = data.get("photo_path")
    if p and os.path.exists(p):
        os.remove(p)

    return path


# ── Hero banner ────────────────────────────────────────────────────────────────
def _hero_banner(data):
    photo_path = data.get("photo_path")

    # Left: title block
    left = Table([[
        Paragraph("MA'LUMOTNOMA", TITLE),
        Paragraph(f"Tuzilgan sana: {datetime.now().strftime('%d.%m.%Y')}", SUBT),
    ]], colWidths=[None])
    left.setStyle(TableStyle([
        ("VALIGN", (0,0),(-1,-1), "MIDDLE"),
        ("ALIGN",  (0,0),(-1,-1), "CENTER"),
    ]))

    # Right: photo or placeholder
    if photo_path and os.path.exists(photo_path):
        right_cell = _rounded_photo(photo_path)
    else:
        right_cell = Paragraph("", NORMAL)

    col_left  = PAGE_W - 3.6*cm if photo_path and os.path.exists(photo_path or "") else PAGE_W
    col_right = 3.4*cm if photo_path and os.path.exists(photo_path or "") else 0

    banner = Table(
        [[left, right_cell]],
        colWidths=[col_left, col_right] if col_right else [PAGE_W]
    )
    banner.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), NAVY),
        ("ROUNDEDCORNERS", [8]),
        ("VALIGN",       (0,0),(-1,-1), "MIDDLE"),
        ("ALIGN",        (0,0),(0,-1),  "LEFT"),
        ("ALIGN",        (1,0),(1,-1),  "CENTER"),
        ("LEFTPADDING",  (0,0),(0,-1),  16),
        ("RIGHTPADDING", (0,0),(0,-1),  8),
        ("TOPPADDING",   (0,0),(-1,-1), 16),
        ("BOTTOMPADDING",(0,0),(-1,-1), 16),
    ]))
    return banner


def _rounded_photo(path):
    try:
        img = Image(path, width=2.8*cm, height=3.2*cm)
        img.hAlign = "CENTER"
        t = Table([[img]], colWidths=[3.2*cm])
        t.setStyle(TableStyle([
            ("BOX",        (0,0),(-1,-1), 2, WHITE),
            ("BACKGROUND", (0,0),(-1,-1), WHITE),
            ("TOPPADDING",    (0,0),(-1,-1), 2),
            ("BOTTOMPADDING", (0,0),(-1,-1), 2),
            ("LEFTPADDING",   (0,0),(-1,-1), 2),
            ("RIGHTPADDING",  (0,0),(-1,-1), 2),
        ]))
        return t
    except Exception:
        return Paragraph("", NORMAL)


# ── Info card (key-value rows) ─────────────────────────────────────────────────
def _card(rows):
    table_data = []
    for i, (label, value) in enumerate(rows):
        bg = STRIPE if i % 2 == 0 else WHITE
        table_data.append([
            Paragraph(label, LABEL),
            Paragraph(str(value), VALUE),
        ])

    t = Table(table_data, colWidths=[5.5*cm, PAGE_W - 5.5*cm])
    style = [
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
        ("RIGHTPADDING",  (0,0),(-1,-1), 8),
        ("TOPPADDING",    (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ("BOX",           (0,0),(-1,-1), 0.5, BORDER),
        ("INNERGRID",     (0,0),(-1,-1), 0.3, BORDER),
        ("LINEAFTER",     (0,0),(0,-1),  1,   BLUE),
    ]
    # alternating row backgrounds
    for i in range(len(rows)):
        bg = STRIPE if i % 2 == 0 else WHITE
        style.append(("BACKGROUND", (0,i), (-1,i), bg))

    t.setStyle(TableStyle(style))
    return t


# ── Text card (free text block) ────────────────────────────────────────────────
def _text_card(text: str):
    lines = text.replace("\n", "<br/>")
    inner = Paragraph(lines, VALUE)
    t = Table([[inner]], colWidths=[PAGE_W])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), STRIPE),
        ("BOX",          (0,0),(-1,-1), 0.5, BORDER),
        ("LINEBEFORE",   (0,0),(0,-1),  3,   BLUE),
        ("LEFTPADDING",  (0,0),(-1,-1), 10),
        ("RIGHTPADDING", (0,0),(-1,-1), 8),
        ("TOPPADDING",   (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
    ]))
    return t


# ── Page background ────────────────────────────────────────────────────────────
def _page_bg(canvas, doc):
    canvas.saveState()
    # Subtle top accent line
    canvas.setFillColor(BLUE)
    canvas.rect(0, A4[1] - 4, A4[0], 4, fill=1, stroke=0)
    # Page number
    canvas.setFont(F, 8)
    canvas.setFillColor(GREY)
    canvas.drawCentredString(A4[0]/2, 1*cm, f"{doc.page}")
    canvas.restoreState()
