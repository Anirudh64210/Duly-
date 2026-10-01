# Duly unit economics model. All inputs are estimates unless sourced in PRICING.md.
import math
S=[1000,10000,100000]
cloud={1000:465,10000:1020,100000:3530}
tools={1000:196,10000:361,100000:674}
ins={1000:270,10000:450,100000:900}
counsel={1000:500,10000:800,100000:2000}
atty={1000:800,10000:1600,100000:3200}
rules={1000:1200,10000:1800,100000:3600}
sec={1000:1250,10000:2500,100000:5000}
admin={1000:150,10000:250,100000:500}
FOUNDER=11332
def fixed(n,view):
    a=cloud[n]+tools[n]+ins[n]+counsel[n]+sec[n]+admin[n]
    if view=='A': return a
    b=a+atty[n]+rules[n]
    if view=='B': return b
    return b+FOUNDER
SUPPORT=0.047  # per student month, paid help (views B, C)
ASK={'opus48':0.044,'sonnet':0.014}
FREE_Q=1.0; PAY_Q=10.0; SCHOOL_Q=4.0
STORE=0.05  # extra storage per payer month
INTL=0.30
def stripe_fee(p,billing=True):
    f=0.029*p+0.30+INTL*0.015*p+INTL*0.01*p+0.005*p
    if billing: f+=0.007*p
    return f
def store_fee(p): return 0.15*p
print("fees 39 yearly", round(stripe_fee(39),2), "4.99", round(stripe_fee(4.99),2), "12 pass", round(stripe_fee(12,False),2), "69 pass", round(stripe_fee(69,False),2))
# per-student cost table
print("\nPer student per month cost (3% paying, base)")
for m in ASK:
  for v in 'ABC':
    row=[]
    for n in S:
        pay=0.03
        ask=( (1-pay)*FREE_Q + pay*PAY_Q )*ASK[m]
        sup=0 if v=='A' else SUPPORT
        tot=fixed(n,v)/n + ask + sup + pay*STORE
        row.append(round(tot,3))
    print(m,v,row)
print("\ncomponents per student month")
for n in S:
    print(n, 'cloud',round(cloud[n]/n,3),'tools+ins+admin',round((tools[n]+ins[n]+admin[n])/n,3),'counsel+atty',round((counsel[n]+atty[n])/n,3),'rules',round(rules[n]/n,3),'sec',round(sec[n]/n,3))

# Options: per student per month revenue and variable cost, given web share
def option(name, model, web=0.85, conv=None):
    a=ASK[model]
    if name=='monthly':
        p=4.99; pay=conv if conv is not None else 0.015
        net = web*(p-stripe_fee(p)) + (1-web)*(p-store_fee(p))
        rev=pay*p; fee=pay*(p-net)
        var= pay*(PAY_Q*a+STORE)
        return rev,fee,var,pay,pay
    if name=='yearly':
        pay=conv if conv is not None else 0.025
        y=0.75; p=39
        ry=pay*y*p/12; fy=pay*y*(web*stripe_fee(p)+(1-web)*store_fee(p))/12
        pm=4.99
        rm=pay*(1-y)*pm; fm=pay*(1-y)*(web*stripe_fee(pm)+(1-web)*store_fee(pm))
        # season pass 1% of students a year at 12
        rs=0.01*12/12; fs=0.01*(web*stripe_fee(12,False)+(1-web)*store_fee(12))/12
        holders=pay+0.01*3/12
        var=holders*(PAY_Q*a+STORE)
        return ry+rm+rs, fy+fm+fs, var, pay, holders
    if name=='pass':
        p=69; buy=conv if conv is not None else 0.025  # share of students buying per year
        hold=buy*2.0  # average 2 years held
        rev=buy*p/12; fee=buy*(web*stripe_fee(p,False)+(1-web)*store_fee(p))/12
        var=hold*(PAY_Q*a+STORE)
        return rev,fee,var,buy,hold
    if name=='school':
        cov=conv if conv is not None else 0.20; price=6.0
        rev=cov*price/12; fee=cov*0.0 + 0  # invoice ACH, ~0
        var=cov*(SCHOOL_Q*a+STORE)
        return rev,fee,var,cov,cov
def contrib(name,model,view,web=0.85,conv=None):
    rev,fee,var,pay,hold=option(name,model,web,conv)
    free_ask=(1-hold)*FREE_Q*ASK[model]
    sup=0 if view=='A' else SUPPORT
    return rev, rev-fee-var, rev-fee-var-free_ask-sup, hold
def fixedN(N,view):
    # linear interpolation between points, extrapolate with 10k-100k slope
    pts=[(n,fixed(n,view)) for n in S]
    if N<=1000: return pts[0][1]
    for (n1,f1),(n2,f2) in zip(pts,pts[1:]):
        if N<=n2: return f1+(f2-f1)*(N-n1)/(n2-n1)
    (n1,f1),(n2,f2)=pts[1],pts[2]
    return f2+(f2-f1)/(n2-n1)*(N-n2)
def breakeven(name,model,view,web=0.85,conv=None):
    _,_,c,_=contrib(name,model,view,web,conv)
    if c<=0: return None
    N=1000
    while N<5_000_000:
        if N*c>=fixedN(N,view): return N
        N=int(N*1.01)+1
    return None
print("\nOptions")
for name in ['monthly','yearly','pass','school']:
  for model in ['opus48','sonnet']:
    rev,gp,c,hold=contrib(name,model,'B')
    gm=gp/rev
    out=[name,model,'rev/stu/mo',round(rev,4),'GM',f"{gm:.0%}",'net of free',round(c,4)]
    for v in 'ABC':
        out.append(v+':'+str(breakeven(name,model,v)))
    print(*out)
    for n in S:
        print('   ',n,'rev/mo',round(rev*n),'gross',round(gp*n),'after free/support',round(c*n),'fixedB',fixed(n,'B'), 'netB', round(c*n-fixed(n,'B')))
print("\nRecommended mix: yearly 2.5% + pass 1.5%/yr + school 20% at 100k")
for model in ['opus48','sonnet']:
  for n in S:
    sc = {1000:0.0,10000:0.10,100000:0.20}[n]
    tot_rev=0; tot_c=0; holders=0
    for name,conv in [('yearly',0.025),('pass',0.015),('school',sc)]:
        rev,fee,var,pay,hold=option(name,model,0.85,conv)
        tot_rev+=rev; tot_c+=rev-fee-var; holders+=hold
    free=(1-holders)*FREE_Q*ASK[model]
    for v in 'ABC':
        sup=0 if v=='A' else SUPPORT
        net=(tot_c-free-sup)*n-fixed(n,v)
        print(model,n,v,'rev',round(tot_rev*n),'net',round(net))
# per payer per year margin
print("\nPer payer per year")
for model in ASK:
  a=ASK[model]
  for p,label,bill in [(39,'yearly web',True),(39,'yearly store',None),(4.99*12,'monthly web 12',True),(69,'pass web over 2y',False),(12,'season web',False)]:
    if bill is None: fee=store_fee(p)
    elif label.startswith('monthly'): fee=12*stripe_fee(4.99)
    else: fee=stripe_fee(p,bill)
    months = 24 if 'pass' in label else (3 if 'season' in label else 12)
    cost=months*(PAY_Q*a+STORE+SUPPORT)
    print(model,label,'price',p,'fee',round(fee,2),'cost',round(cost,2),'contrib',round(p-fee-cost,2),f"{(p-fee-cost)/p:.0%}")
# store sensitivity yearly 39 opus
print("\nStore share sensitivity, yearly option, sonnet & opus, view B break-even")
for model in ASK:
  for web in [1.0,0.85,0.5,0.0]:
    print(model, 'web',web, breakeven('yearly',model,'B',web), 'A', breakeven('yearly',model,'A',web))
# conversion sensitivity for yearly
print("\nConversion sensitivity yearly, breakeven N")
for model in ASK:
  for conv in [0.02,0.03,0.04,0.05,0.08]:
    print(model,conv,[breakeven('yearly',model,v,0.85,conv) for v in 'ABC'])

print("\n==== v2: fixed held at 100k stack beyond 100k")
def fixedN2(N,view):
    pts=[(n,fixed(n,view)) for n in S]
    if N<=1000: return pts[0][1]
    for (n1,f1),(n2,f2) in zip(pts,pts[1:]):
        if N<=n2: return f1+(f2-f1)*(N-n1)/(n2-n1)
    return pts[2][1]
def be2(c,view):
    if c<=0: return None
    N=1000
    while N<2_000_000:
        if N*c>=fixedN2(N,view): return N
        N=int(N*1.01)+1
    return None
def share_needed(name,model,view,n):
    lo,hi=0.0,1.0
    for _ in range(60):
        mid=(lo+hi)/2
        _,_,c,_=contrib(name,model,view,0.85,mid)
        if c*n>=fixed(n,view): hi=mid
        else: lo=mid
    return hi
for name in ['monthly','yearly','pass','school']:
  for model in ['opus48','sonnet']:
    rev,gp,c,hold=contrib(name,model,'B')
    rA=contrib(name,model,'A')[2]
    print(name,model,'rev',round(rev,3),'cB',round(c,4),'cA',round(rA,4),
      'beA',be2(rA,'A'),'beB',be2(c,'B'),
      'share10kA',f"{share_needed(name,model,'A',10000):.1%}",'share100kA',f"{share_needed(name,model,'A',100000):.1%}",
      'share100kB',f"{share_needed(name,model,'B',100000):.1%}",'share100kC',f"{share_needed(name,model,'C',100000):.1%}")
print("\nMix scenarios (yearly y, pass p per yr, school s) per student per month")
def mix(model,view,y,p,s,web=0.85,freeq=FREE_Q,sup=SUPPORT):
    tot_rev=0; tot_c=0; holders=0
    for name,conv in [('yearly',y),('pass',p),('school',s)]:
        rev,fee,var,pay,hold=option(name,model,web,conv)
        tot_rev+=rev; tot_c+=rev-fee-var; holders+=hold
    free=(1-holders)*freeq*ASK[model]
    sp=0 if view=='A' else sup
    return tot_rev, tot_c-free-sp
for label,y,p,s in [('low',0.02,0.01,0.0),('base',0.025,0.015,0.10),('base+school20',0.025,0.015,0.20),('good',0.04,0.02,0.25)]:
  for model in ['opus48','sonnet']:
    rev,c=mix(model,'B',y,p,s); rA=mix(model,'A',y,p,s)[1]
    print(label,model,'rev/stu/mo',round(rev,3),'yearly rev 100k',round(rev*100000*12),'cB',round(c,4),'beA',be2(rA,'A'),'beB',be2(c,'B'),'beC',be2(mix(model,'C',y,p,s)[1],'C'),
          'net100k A/B/C',[round(mix(model,v,y,p,s)[1]*100000-fixed(100000,v)) for v in 'ABC'],
          'net10k A/B',[round(mix(model,v,y,p,s)[1]*10000-fixed(10000,v)) for v in 'AB'])
# store share effect on recommended base mix
print("\nstore share effect, base+school20, sonnet, net100k B")
for web in [1.0,0.85,0.5,0.0]:
  for model in ['opus48','sonnet']:
    rev,c=mix(model,'B',0.025,0.015,0.20,web)
    print(model,web,round(c*100000-fixed(100000,'B')), 'per yearly payer net', round(39-(web*stripe_fee(39)+(1-web)*store_fee(39)),2))

print("\n==== v3 options with pass 1.5%/yr")
for name,conv in [('monthly',0.015),('yearly',0.025),('pass',0.015),('school',0.20)]:
  for model in ['opus48','sonnet']:
    rev,fee,var,pay,hold=option(name,model,0.85,conv)
    gm=(rev-fee-var)/rev
    cA=contrib(name,model,'A',0.85,conv)[2]; cB=contrib(name,model,'B',0.85,conv)[2]
    print(name,model,'rev/stu/mo',round(rev,3),'rev/yr@100k',round(rev*1.2e6),'GM',f"{gm:.0%}",'cA',round(cA,4),'cB',round(cB,4),'beA',be2(cA,'A'),'beB',be2(cB,'B'),
      'need100kA',f"{share_needed(name,model,'A',100000):.1%}",'need100kB',f"{share_needed(name,model,'B',100000):.1%}",'need10kA',f"{share_needed(name,model,'A',10000):.1%}")
print("\n==== v3 mixes")
for label,y,p,s in [('low',0.015,0.005,0.0),('base',0.02,0.01,0.10),('base school20',0.02,0.01,0.20),('good',0.03,0.015,0.25)]:
  for model,sup in [('opus48',SUPPORT),('sonnet',SUPPORT),('sonnet',SUPPORT/2)]:
    rev,c=mix(model,'B',y,p,s,sup=sup); rA=mix(model,'A',y,p,s,sup=sup)[1]; rC=mix(model,'C',y,p,s,sup=sup)[1]
    print(label,model,round(sup,4),'rev/stu/mo',round(rev,3),'rev/yr 10k',round(rev*1.2e5),'rev/yr 100k',round(rev*1.2e6),'beA',be2(rA,'A'),'beB',be2(c,'B'),'beC',be2(rC,'C'),
          'net/mo 100k A/B/C',[round(mix(model,v,y,p,s,sup=sup)[1]*100000-fixed(100000,v)) for v in 'ABC'],
          'net/mo 10k A/B',[round(mix(model,v,y,p,s,sup=sup)[1]*10000-fixed(10000,v)) for v in 'AB'],
          'net/mo 1k A',round(mix(model,'A',y,p,s,sup=sup)[1]*1000-fixed(1000,'A')))
print("\nstore share effect, base school20, net/mo 100k view B")
for web in [1.0,0.85,0.5,0.0]:
    print(web,[round(mix(m,'B',0.02,0.01,0.20,web)[1]*100000-fixed(100000,'B')) for m in ['opus48','sonnet']])
print("\nlaunch founding price 29: yearly net web", round(29-stripe_fee(29),2), 'store', round(29*0.85,2), 'hardship 19 web', round(19-stripe_fee(19),2))
print("contrib 29 sonnet",round(29-stripe_fee(29)-12*(PAY_Q*0.014+STORE+SUPPORT),2),"opus",round(29-stripe_fee(29)-12*(PAY_Q*0.044+STORE+SUPPORT),2))
print("contrib 19 sonnet",round(19-stripe_fee(19)-12*(PAY_Q*0.014+STORE+SUPPORT),2),"opus",round(19-stripe_fee(19)-12*(PAY_Q*0.044+STORE+SUPPORT),2))
print("school seat 6, 4q: sonnet",round(6-12*(4*0.014+STORE+SUPPORT),2),"opus",round(6-12*(4*0.044+STORE+SUPPORT),2))
print("free student per yr cost opus",round(12*(0.044+SUPPORT),2),"sonnet",round(12*(0.014+SUPPORT),2),"sonnet half support",round(12*(0.014+SUPPORT/2),2))
print("fixed A/B/C", [[fixed(n,v) for n in S] for v in 'ABC'])

# ==== v4: adversarial review, 2026-10-01. Supersedes the v3 mixes in PRICING.md.
# Changes (all estimates): no $4.99 monthly plan in the recommended mix (v3 counted 25% of payers
# on it); conversion read as a stock (share holding Plus at any time), not a flow; refunds at the
# RevenueCat 2025 Education rate (4.86%), fees not returned; founding $29 and Stay pass $59 at
# 1k/10k (launch years); a share on founding and hardship prices at 100k; Sonnet cache misses at low
# volume; a school-channel compliance cost (SOC 2 Type II and security reviews) whenever schools pay.
print("\n==== v4 reviewed model")
REFUND=0.0486
ASK4={'opus48':{1000:0.044,10000:0.044,100000:0.044},
      'sonnet':{1000:0.022,10000:0.016,100000:0.014}}  # cache write 3500 tok at $2.75/M when cold
SCHOOL_COMPLIANCE=2500  # per month when any school pays (estimate; Vanta: SOC 2 $10k-$80k first year)
def ask4(model,n):
    if n in ASK4[model]: return ASK4[model][n]
    return ASK4[model][100000] if n>100000 else ASK4[model][10000 if n>10000 else 1000]
def net_web(p,bill): return p-stripe_fee(p,bill)
def net_store(p): return p*0.85
def net_sale(p,bill,web=0.85): return web*net_web(p,bill)+(1-web)*net_store(p)
def scen4(model,view,n,yearly,passbuy,season,school,launch,sup=SUPPORT,web=0.85,yprice=None,school_price=6.0):
    a=ask4(model,n)
    if yprice is None:
        yprice = 29.0 if launch else 39.0
    ppass = 59.0 if launch else 69.0
    # yearly holders pay at a blended price: launch: 90% founding, 10% hardship; list: 70% list, 20% founding, 10% hardship
    mix = [(yprice,0.9),(19.0,0.1)] if launch else [(yprice,0.7),(29.0,0.2),(19.0,0.1)]
    rev = sum(yearly*p*w for p,w in mix)/12
    net = sum(yearly*net_sale(p,True,web)*w for p,w in mix)/12
    rev += passbuy*ppass/12;  net += passbuy*net_sale(ppass,False,web)/12
    rev += season*12/12;      net += season*net_sale(12,False,web)/12
    refunds = REFUND*rev
    net -= refunds
    holders = yearly + passbuy*2.0 + season*0.25
    var = holders*(PAY_Q*a+STORE)
    srev = school*school_price/12
    var += school*(SCHOOL_Q*a+STORE)
    free = max(0.0,1-holders-school)*FREE_Q*a
    support = 0 if view=='A' else sup
    per_student_net = net + srev - var - free - support
    fixed_n = fixedN2(n,view) + (SCHOOL_COMPLIANCE if school>0 else 0)
    total_rev = (rev - refunds + srev)*n
    cost = fixed_n + (rev - refunds - net)*n + (var+free+support)*n   # fees + variable + fixed
    return total_rev, cost, total_rev-cost, holders
CASES4 = {
  # name: (yearly stock, stay-pass buys a year, season passes a year, school share at 1k/10k/100k)
  'low':  (0.007, 0.0015, 0.0025, {1000:0,10000:0,100000:0}),
  'base': (0.0125,0.00375,0.005, {1000:0,10000:0,100000:0.10}),
  'good': (0.02,  0.0075, 0.01,  {1000:0,10000:0.10,100000:0.20}),
}
for case,(y,p,s,sch) in CASES4.items():
  for model in ['opus48','sonnet']:
    for v in 'ABC':
      row=[]
      for n in S:
        r,c,nt,h=scen4(model,v,n,y,p,s,sch[n],launch=(n<100000))
        row.append(f"{n}: rev {r:,.0f} cost {c:,.0f} net {nt:,.0f} margin {nt/r:.0%} payers {h:.2%}")
      print(case,model,v,' | '.join(row))
def be4(model,view,case,launch=False,yprice=None):
    y,p,s,sch=CASES4[case]; school=sch[100000]
    N=1000
    while N<3_000_000:
        r,c,nt,h=scen4(model,view,N,y,p,s,school if N>=50000 else 0,launch,yprice=yprice)
        if nt>=0: return N
        N=int(N*1.01)+1
    return None
print("\nv4 break-even students, list prices, schools from 50k")
for case in CASES4:
  for model in ['opus48','sonnet']:
    print(case,model,[be4(model,v,case) for v in 'ABC'])
print("\nv4 price sensitivity at 100k, base, view B, same conversion")
for yp in [29.0,39.0,49.0]:
    print(yp,[round(scen4(m,'B',100000,*CASES4['base'][:3],0.10,False,yprice=yp)[2]) for m in ['opus48','sonnet']])
print("v4 $49 with 20% fewer yearly payers, base, view B 100k",[round(scen4(m,'B',100000,0.0125*0.8,0.00375,0.005,0.10,False,yprice=49.0)[2]) for m in ['opus48','sonnet']])
print("\nv4 share holding Plus needed at 100k, list prices, no schools (yearly:pass ratio as base)")
for model in ['opus48','sonnet']:
  for v in 'ABC':
    lo,hi=0.0,0.5
    for _ in range(50):
        k=(lo+hi)/2
        nt=scen4(model,v,100000,0.0125*k/0.02,0.00375*k/0.02,0.005,0.0,False)[2]
        if nt>=0: hi=k
        else: lo=k
    print(model,v,f"{hi:.1%}")
print("\nv4 per payer per year, web, list $39: refunds included")
for model in ['opus48','sonnet']:
    a=ASK4[model][100000]; fee=stripe_fee(39); cost=12*(PAY_Q*a+STORE+SUPPORT); ref=REFUND*39
    print(model,'fee',round(fee,2),'refund',round(ref,2),'serve',round(cost,2),'contrib',round(39-fee-ref-cost,2),f"{(39-fee-ref-cost)/39:.0%}")
print("\nv4 levers at 100k, base conversion, view B (Opus / Sonnet net a month, margin)")
def lev(label,**kw):
    y,p,s,_=CASES4['base']
    out=[]
    for m in ['opus48','sonnet']:
        args=dict(yearly=y,passbuy=p,season=s,school=kw.get('school',0.10),launch=False,sup=kw.get('sup',SUPPORT),school_price=kw.get('sp',6.0))
        r,c,nt,h=scen4(m,'B',100000,**args)
        out.append(f"{nt:,.0f} ({nt/r:.0%})")
    print(label,out)
lev("base")
lev("support contacts halved",sup=SUPPORT/2)
lev("schools 20% at $6",school=0.20)
lev("schools 20% at $12",school=0.20,sp=12.0)
lev("schools 20% at $12, support halved",school=0.20,sp=12.0,sup=SUPPORT/2)
lev("schools 30% at $12, support halved",school=0.30,sp=12.0,sup=SUPPORT/2)
print("\nv4 break-even students with school seats at $12 (schools from 50k at the case share)")
def be4s(model,view,case,sp,sup=SUPPORT):
    y,p,s,sch=CASES4[case]; school=sch[100000]
    N=1000
    while N<3_000_000:
        nt=scen4(model,view,N,y,p,s,school if N>=50000 else 0,False,sup=sup,school_price=sp)[2]
        if nt>=0: return N
        N=int(N*1.01)+1
    return None
for case in CASES4:
  for model in ['opus48','sonnet']:
    print(case,model,'$12',[be4s(model,v,case,12.0) for v in 'ABC'],'$12 support halved',[be4s(model,v,case,12.0,SUPPORT/2) for v in 'ABC'])
print("\nv4 nets at 1k/10k/100k, recommended plan with $12 seats, base, A/B/C")
for m in ['opus48','sonnet']:
  for v in 'ABC':
    print(m,v,[round(scen4(m,v,n,*CASES4['base'][:3],CASES4['base'][3][n],n<100000,school_price=12.0)[2]) for n in S],
          'rev',[round(scen4(m,v,n,*CASES4['base'][:3],CASES4['base'][3][n],n<100000,school_price=12.0)[0]) for n in S])
print("\nv4 table for PRICING.md 4.2: recommended plan, $12 seats; rev/mo and net/mo A/B/C at 1k, 10k, 100k")
for case in CASES4:
  y,p,s,sch=CASES4[case]
  for m in ['opus48','sonnet']:
    cells=[]
    for n in S:
      res=[scen4(m,v,n,y,p,s,sch[n],n<100000,school_price=12.0) for v in 'ABC']
      cells.append(f"{n}: rev {res[0][0]:,.0f} net {res[0][2]:,.0f}/{res[1][2]:,.0f}/{res[2][2]:,.0f} mB {res[1][2]/res[1][0]:.0%}")
    print(case,m,' | '.join(cells))
for m in ['opus48','sonnet']:
  for n in S:
    y,p,s,sch=CASES4['base']; a=ask4(m,n); h=y+2*p+0.25*s; sc=sch[n]
    print('ask',m,n,round(n*((1-h-sc)*FREE_Q+h*PAY_Q+sc*SCHOOL_Q)*a))

# =====================================================================================
# ==== ATTORNEY NETWORK LINE (BACKLOG B10), added 2026-10-01. ALL INPUTS ARE ESTIMATES.
# Legal basis: business/attorney-legal.md and attorney-market.md. Write-up: ATTORNEYS.md.
# Sits on top of the v4 recommended plan (base case, $12 school seats). Not legal advice.
#  A  flat firm listing, sold as advertising: every firm pays the same flat monthly fee,
#     students search and choose, no cut, no matching to the student's case.
#  B  student legal service plan: students pay Duly a higher Plus tier; Duly pays panel
#     firms a flat amount per consult; firms set a member discount on further work.
#  C  Arizona ABS: Duly owns an immigration law firm and keeps its profit (C), or holds a
#     licensed share of a partner's ABS and takes a share of fees (C2, structure unverified).
# The percentage cut of independent firms' fees is NOT modelled as an option: not allowed.
# =====================================================================================
print("\n==== ATTORNEY NETWORK LINE (B10)")
ATT_START=10000                 # firms will not pay before about 10k students (attorney-market.md 9)
HIRE={'low':0.005,'base':0.015,'good':0.03}   # share of students hiring a lawyer via Duly a year
CAC=749                         # First Page Sage 2026 blended legal client acquisition cost
AVG_FEE=4000                    # average fee per retained student matter (attorney-market.md 9)
# --- A: flat listing
A_CAPTURE=0.5                   # firms pay half of what a client costs them elsewhere
A_REGIONS={10000:5,100000:10}   # regions = states or metros shown as separate lists
A_PER_REGION={10000:5,100000:8} # firms listed per region (Florida needs at least 4 firms)
A_FIRM_OPS=60                   # per firm-month: licence and discipline re-checks, complaints, account support
A_COUNSEL={10000:1000,100000:2000}  # ethics counsel, FL qualifying-provider filings, CA joint-ad agreements, IL ICS letters
A_INS={10000:150,100000:400}    # added media and advertising liability cover
A_ONE_TIME=(20000,50000)        # multistate ethics opinion and agreements, before launch
# --- B: legal service plan
B_PRICE=99.0                    # a year, includes Plus, one 30-minute consult with a panel firm
B_HOLD={'low':0.0025,'base':0.005,'good':0.01}   # share of students holding the plan
B_USE=0.5                       # share of members who use the consult in a year
B_PAY_CONSULT=100.0             # Duly pays the firm per consult (retail 30 min is about $200)
B_CANNIBAL=0.4                  # share of plan members who would have held Plus at $39 anyway
B_PLUS_CONTRIB=30.0             # what one such Plus payer would have contributed a year
B_PANEL={10000:10,100000:30}    # panel firms
B_ADMIN={10000:1000,100000:3000}   # panel management, consult booking, plan filings
B_COUNSEL=2000                  # plan counsel; NJ registration, NY annual report, insurance-law states
B_INS={10000:300,100000:600}
B_ONE_TIME=(40000,100000)
# --- C: Arizona ABS owned by Duly
C_CHOOSE=0.4                    # share of hiring students who pick the Duly-owned firm (others listed beside it)
C_DISCOUNT=0.10                 # student price below the firm's list fee
C_CAP=90                        # matters per attorney a year, with one paralegal each
C_MIN_ATT=2                     # cover, conflicts and leave
C_ATT=14000; C_PARA=5400; C_MALP=700; C_SOFT=300   # per attorney-month, loaded
C_FIXED=500+2000+1500           # ABS annual fee /12, AZ counsel and compliance, billing and trust accounting
C_CARD=0.03
C_ONE_TIME=(150000,300000)      # $9k application, AZ counsel, 7 to 9 months of staff before revenue
C2_SHARE=0.15; C2_FIXED=2500    # C2: licensed share of a partner ABS, 15% of fees on Duly-chosen matters

def interp(d,n):
    if n<=10000: return d[10000]
    return d[10000]+(d[100000]-d[10000])*min(1.0,(n-10000)/90000) if n<=100000 else d[100000]

def att_line(opt,case,n):
    """Monthly (revenue, cost, net, detail) for one attorney option at n students."""
    if n<ATT_START: return 0.0,0.0,0.0,{}
    h=HIRE[case]; matters=n*h   # a year
    if opt=='A':
        firms=max(4,round(interp(A_REGIONS,n)*interp(A_PER_REGION,n)))
        rev=matters*CAC*A_CAPTURE/12
        fee=rev/firms
        cost=firms*(A_FIRM_OPS+stripe_fee(fee))+interp(A_COUNSEL,n)+interp(A_INS,n)
        return rev,cost,rev-cost,{'firms':firms,'fee/firm/mo':round(fee),'matters/yr':round(matters),
                                  'clients/firm/yr':round(matters/firms,1)}
    if opt=='B':
        members=n*B_HOLD[case]
        rev=members*B_PRICE/12
        fees=members*(stripe_fee(B_PRICE)+REFUND*B_PRICE)/12
        consults=members*B_USE*B_PAY_CONSULT/12
        serve=members*12*(PAY_Q*0.03+STORE)/12   # Ask, blended model, per member month
        lost=members*B_CANNIBAL*B_PLUS_CONTRIB/12
        fixedc=interp(B_ADMIN,n)+B_COUNSEL+interp(B_INS,n)
        cost=fees+consults+serve+lost+fixedc
        panel=round(interp(B_PANEL,n))
        return rev,cost,rev-cost,{'members':round(members),'panel firms':panel,
                                  'paid to each firm/yr':round(consults*12/panel)}
    if opt=='C':
        m=matters*C_CHOOSE
        price=AVG_FEE*(1-C_DISCOUNT)
        rev=m*price/12
        att=max(C_MIN_ATT,math.ceil(m/C_CAP))
        cost=att*(C_ATT+C_PARA+C_MALP+C_SOFT)+C_FIXED+rev*C_CARD
        return rev,cost,rev-cost,{'matters/yr':round(m),'attorneys':att,'rev/attorney/yr':round(rev*12/att)}
    if opt=='C2':
        m=matters*C_CHOOSE
        rev=m*AVG_FEE*(1-C_DISCOUNT)*C2_SHARE/12
        return rev,C2_FIXED,rev-C2_FIXED,{'matters/yr':round(m)}

def sub_net(model,view,n,launch=None,case='base',sp=12.0):
    y,p,s,sch=CASES4[case]
    if launch is None: launch=n<100000
    return scen4(model,view,n,y,p,s,sch[n] if n in sch else (sch[100000] if n>=50000 else 0),launch,school_price=sp)

print("\nper option and hire case: monthly rev / cost / net at 10k and 100k; revenue per student a year")
for opt in ['A','B','C','C2']:
    for case in HIRE:
        cells=[]
        for n in [10000,100000]:
            r,c,nt,d=att_line(opt,case,n)
            cells.append(f"{n}: rev {r:,.0f} cost {c:,.0f} net {nt:,.0f} rev/stu/yr {r*12/n:.2f} {d}")
        print(opt,case,' | '.join(cells))
print("one-time before launch: A",A_ONE_TIME,"B",B_ONE_TIME,"C",C_ONE_TIME)

print("\ncombined net a month: v4 base plan ($12 seats) + attorney option; Opus / Sonnet")
for opt in [None,'A','B','C','C2']:
    for case in (['base'] if opt is None else HIRE):
        row=[]
        for n in [10000,100000]:
            for v in 'ABC':
                vals=[]
                for m in ['opus48','sonnet']:
                    a=att_line(opt,case,n)[2] if opt else 0
                    vals.append(sub_net(m,v,n)[2]+a)
                row.append(f"{n}{v}: {vals[0]:,.0f}/{vals[1]:,.0f}")
        rev=[round(sub_net('sonnet','A',n)[0]+(att_line(opt,case,n)[0] if opt else 0)) for n in [10000,100000]]
        print(opt or 'none',case,'rev 10k/100k',rev,' | '.join(row))

def be_att(model,view,opt,case,sub='base'):
    y,p,s,sch=CASES4[sub]; school=sch[100000]
    N=1000
    while N<3_000_000:
        nt=scen4(model,view,N,y,p,s,school if N>=50000 else 0,False,school_price=12.0)[2]
        if opt: nt+=att_line(opt,case,N)[2]
        if nt>=0: return N
        N=int(N*1.01)+1
    return None
print("\nbreak-even students, list prices, schools from 50k, $12 seats: [A,B,C views] Opus / Sonnet")
for opt in [None,'A','B','C','C2']:
    for case in (['base'] if opt is None else HIRE):
        print(opt or 'none',case,[be_att('opus48',v,opt,case) for v in 'ABC'],'/',[be_att('sonnet',v,opt,case) for v in 'ABC'])
print("\nsensitivity: A with firms paying the full $749 per client (market ceiling), base hire")
A_CAPTURE=1.0
print('A full',[round(att_line('A','base',n)[2]) for n in [10000,100000]],[att_line('A','base',n)[3] for n in [10000,100000]])
A_CAPTURE=0.25
print('A quarter',[round(att_line('A','base',n)[2]) for n in [10000,100000]],[att_line('A','base',n)[3] for n in [10000,100000]])
A_CAPTURE=0.5
print("sensitivity: B at $149 a year (TrackMyOPT Dedicated level), base hold")
B_PRICE=149.0
print('B 149',[round(att_line('B','base',n)[2]) for n in [10000,100000]])
B_PRICE=99.0
print("sensitivity: C at 60 matters per attorney",end=' ')
C_CAP=60
print([round(att_line('C','base',n)[2]) for n in [10000,100000]]); C_CAP=90
def c_needed(n):
    for k in range(1,400):
        h=k/10000
        m=n*h*C_CHOOSE; r=m*AVG_FEE*(1-C_DISCOUNT)/12
        c=max(C_MIN_ATT,math.ceil(m/C_CAP))*(C_ATT+C_PARA+C_MALP+C_SOFT)+C_FIXED+r*C_CARD
        if r>=c: return h
    return None
print("C: share of students hiring through Duly needed for the owned firm to cover itself:",
      {n:f"{c_needed(n):.2%}" if c_needed(n) else 'over 4%' for n in [10000,30000,50000,100000]})
