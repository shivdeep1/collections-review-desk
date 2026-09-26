"""Build the plain-language, single-page hackathon submission."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "public" / "collections-review-one-pager.pdf"
for name, filename in [("Arial", "arial.ttf"), ("Arial-Bold", "arialbd.ttf")]:
    pdfmetrics.registerFont(TTFont(name, str(Path("C:/Windows/Fonts") / filename)))
pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-Bold")

WIDTH, HEIGHT = A4
GREEN = colors.HexColor("#173E38")
INK = colors.HexColor("#253B35")
MUTED = colors.HexColor("#52655E")
PALE = colors.HexColor("#F0F5ED")
MARGIN = 42
CONTENT = WIDTH - MARGIN * 2
document = canvas.Canvas(str(PDF), pagesize=A4, pageCompression=1)
document.setTitle("Collections Review Desk - One-page solution")
document.setAuthor("Collections Review Desk team")


def text(value, x, top, width, size=11.3, leading=16, color=INK, bold=False):
    style = ParagraphStyle(
        "body", fontName="Arial-Bold" if bold else "Arial", fontSize=size,
        leading=leading, textColor=color, spaceAfter=0,
    )
    paragraph = Paragraph(value, style)
    _, height = paragraph.wrap(width, HEIGHT)
    paragraph.drawOn(document, x, top - height)
    return top - height


document.setFillColor(GREEN)
document.rect(0, HEIGHT - 116, WIDTH, 116, fill=1, stroke=0)
text("Collections Review Desk", MARGIN, HEIGHT - 29, CONTENT, 25, 30, colors.white, True)
text("A second pair of eyes for the bank's collection calls", MARGIN, HEIGHT - 70,
     CONTENT, 14.3, 20, colors.HexColor("#D5E8C8"))

y = text(
    "When a customer misses a loan payment, a collection agent calls them. After the call, "
    "the agent writes a note. Our tool helps the bank check whether that note matches "
    "what the customer actually said.", MARGIN, HEIGHT - 140, CONTENT,
)
y -= 20
y = text("A simple example", MARGIN, y, CONTENT, 13, 17, GREEN, True)
y -= 12
gap = 14
card_width = (CONTENT - gap) / 2
card_height = 112
for x, label, quote, fill in [
    (MARGIN, "The agent writes", '"Customer promised to pay Rs. 18,500 by Friday."', PALE),
    (MARGIN + card_width + gap, "The customer actually says",
     '\"I disagree with the amount. Explain the charges first. I cannot promise payment yet.\"',
     colors.HexColor("#F8F2E6")),
]:
    document.setFillColor(fill)
    document.roundRect(x, y - card_height, card_width, card_height, 8, fill=1, stroke=0)
    text(label, x + 14, y - 13, card_width - 28, 10.3, 14, MUTED, True)
    text(quote, x + 14, y - 38, card_width - 28, 12.3, 17, INK)
y -= card_height + 13
y = text(
    "The tool flags the mismatch and shows the supervisor the exact words from the call. "
    "If the agent asks for payment to an address missing from the bank's approved list, "
    "it flags that for investigation too.", MARGIN, y, CONTENT,
)
y -= 20
y = text("How it works", MARGIN, y, CONTENT, 13, 17, GREEN, True)
y -= 10
steps = [
    ("1", "<b>Bring in the call.</b> AI turns the recording into text. A reviewer checks the words and who said them."),
    ("2", "<b>Compare what happened.</b> AI checks the call against the agent's note and the bank's rules. The app checks payment addresses against the approved list."),
    ("3", "<b>Let the supervisor decide.</b> They can replay the call, inspect the evidence, then investigate, ask for more information or close the case."),
    ("4", "<b>Keep a record.</b> The app saves the decision, the reason and the follow-up, so the bank can see who acted and why."),
]
for number, body in steps:
    document.setFillColor(GREEN)
    document.circle(MARGIN + 10, y - 10, 10, fill=1, stroke=0)
    document.setFillColor(colors.white)
    document.setFont("Arial-Bold", 10)
    document.drawCentredString(MARGIN + 10, y - 13.3, number)
    y = text(body, MARGIN + 31, y, CONTENT - 31, 10.7, 14.7) - 10

y -= 3
y = text("Why a bank would use it", MARGIN, y, CONTENT, 13, 17, GREEN, True)
y -= 7
y = text(
    "It helps supervisors find calls that need attention, correct misleading records and "
    "check questionable payment requests. A flag is a reason to investigate. The human "
    "supervisor remains responsible for the decision.", MARGIN, y, CONTENT, 10.7, 14.7,
)
y -= 15
demo = (
    "<b>What our prototype demonstrates</b><br/>"
    "A Hindi-English sample call, Sarvam AI transcription and review, and a saved "
    "supervisor-approved follow-up. The people and conversation are made up. Bank actions "
    "run inside the demo. A bank pilot would test accuracy and time saved on approved historical calls."
)
style = ParagraphStyle("demo", fontName="Arial", fontSize=9.6, leading=13.2, textColor=INK)
para = Paragraph(demo, style)
_, demo_height = para.wrap(CONTENT - 24, HEIGHT)
box_height = demo_height + 22
if y - box_height < 51:
    raise ValueError(f"One-page layout overflow: footer starts at {y - box_height:.1f}")
document.setFillColor(PALE)
document.roundRect(MARGIN, y - box_height, CONTENT, box_height, 7, fill=1, stroke=0)
para.drawOn(document, MARGIN + 12, y - 11 - demo_height)

url = "https://github.com/shivdeep1/collections-review-desk"
text("Public code: github.com/shivdeep1/collections-review-desk", MARGIN, 33,
     CONTENT, 8.5, 11, MUTED)
document.linkURL(url, (MARGIN, 20, WIDTH - MARGIN, 35), relative=0, thickness=0)
document.showPage()
document.save()
print(PDF)
