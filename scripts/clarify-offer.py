#!/usr/bin/env python3
"""Idempotent copy fixes for the checked-in app (upstream source is absent)."""
from pathlib import Path
root = Path(__file__).resolve().parents[1]
p = root / 'assets/index-CAFUB5Vv.js'
s = p.read_text()
s = s.replace('children:["YOUR ONE-STOP",r.jsx("br",{"data-source-loc":"src/App.tsx:218:29"}),"PARTNER FOR ",r.jsx("span",{className:V("px-3 border-2 inline-block mt-1",Ct,rt),"data-source-loc":"src/App.tsx:219:28",children:"CUSTOM"}),r.jsx("br",{"data-source-loc":"src/App.tsx:219:117"}),"CLOTHING IN UAE"]', 'children:["Custom T-Shirts & Uniforms,",r.jsx("br",{}),"Made in Ajman"]')
s = s.replace("Blank & custom apparel — men's, women's, kids, uniforms, caps & branding. Cut, stitched & printed under one roof. Urgent event in hours? Our in-house DTF facility prints while others quote.", 'Branded apparel for businesses, schools, events and clothing brands across the UAE. In-house DTF, embroidery, sublimation and bulk production. Send your logo, quantity and deadline for a clear quote and digital mockup. DTF printing from 1 piece. Garment minimums vary by product.')
s = s.replace('href:"#categories",className:V("inline-flex items-center gap-2 px-7', 'href:"https://wa.me/971582045242?text=Hello%2C%20I%20would%20like%20a%20quote.%20Logo%3A%20%20Quantity%3A%20%20Deadline%3A",className:V("inline-flex items-center gap-2 px-7',1)
s = s.replace('"Shop blanks "','"Get a WhatsApp Quote "',1)
s = s.replace('href:"#quote",className:V("inline-flex items-center gap-2 px-7','href:"#categories",className:V("inline-flex items-center gap-2 px-7',1)
s = s.replace('"Build a quote "','"See Products & Prices "',1)
s = s.replace('children:"GET A QUOTE"','children:"GET A QUOTE · DTF FROM 1 · GARMENT MINIMUMS VARY"')
s = s.replace('children:["AED ",xi.toFixed(2)," / PC × ",xa," PCS ",ll>0&&`· −${Math.round(ll*100)}% BULK`]', 'children:["AED ",xi.toFixed(2)," per piece before discount; AED ",(xi*(1-ll)).toFixed(2)," per piece after discount · ",xa," pieces · ",Math.round(ll*100),"% bulk discount. Total rounded to nearest AED; unit prices rounded to 2 decimals."]')
s = s.replace('name:`${s} ${String(l).padStart(2,"0")}`','name:`${s} — Ref ${String(l).padStart(2,"0")}`')
s = s.replace('blurb:d.blurb??"Custom-made to your artwork, size curve and deadline."','blurb:(d.blurb??"Custom-made to your artwork, size curve and deadline.")') if False else s
# Append to the data object after overrides so cards and details share the same disclosure.
s = s.replace('moq:d.moq??12,...d}),yd=', 'moq:d.moq??12,...d,blurb:(d.blurb??"Custom-made to your artwork, size curve and deadline.")+" Catalog reference, not a verified distinct model; image is illustrative. Fabric/GSM and availability to be confirmed. Displayed AED price is an indicative per-piece starting estimate; printing inclusion is not confirmed. Request an itemised garment + printing quote."}),yd=')
s = s.replace('SAME-DAY DTF','ASK ABOUT DTF TIMING').replace('Same-day DTF · 5-day sampling · 2-wk bulk.', 'Ajman production; confirm timing for your order.')
p.write_text(s)
