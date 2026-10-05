import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const TD_KEY = process.env.TWELVE_DATA_API_KEY;

const pairMap = {
  "EUR/USD": ["EUR","USD"],
  "GBP/USD": ["GBP","USD"],
  "USD/JPY": ["USD","JPY"],
  "XAU/USD": ["XAU","USD"]
};

function ema(values, period) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let e = values.slice(0, period).reduce((a,b)=>a+b,0) / period;
  for (let i=period; i<values.length; i++) e = values[i]*k + e*(1-k);
  return e;
}
function rsi(values, period=14) {
  if (values.length <= period) return 50;
  let gains=0, losses=0;
  for(let i=1;i<=period;i++){
    const d=values[i]-values[i-1];
    if(d>=0) gains+=d; else losses-=d;
  }
  let avgG=gains/period, avgL=losses/period;
  for(let i=period+1;i<values.length;i++){
    const d=values[i]-values[i-1];
    avgG=(avgG*(period-1)+Math.max(d,0))/period;
    avgL=(avgL*(period-1)+Math.max(-d,0))/period;
  }
  if(avgL===0) return 100;
  return 100-(100/(1+avgG/avgL));
}

async function td(path, params={}) {
  if (!TD_KEY) throw new Error("TWELVE_DATA_API_KEY is missing");
  const url = new URL("https://api.twelvedata.com/"+path);
  Object.entries({...params, apikey:TD_KEY}).forEach(([k,v])=>url.searchParams.set(k,v));
  const r = await fetch(url);
  if(!r.ok) throw new Error(`Market provider HTTP ${r.status}`);
  return await r.json();
}

app.get("/health",(req,res)=>res.json({ok:true, service:"AI Signal Live"}));

app.get("/signal", async (req,res) => {
  try {
    const pair=req.query.pair || "EUR/USD";
    const interval=req.query.timeframe || "15min";
    const [from,to]=pairMap[pair] || pair.split("/");
    const data=await td("time_series",{
      symbol:`${from}/${to}`, interval, outputsize:100, format:"JSON"
    });
    if(!data.values?.length) throw new Error(data.message || "No candle data");
    const candles=[...data.values].reverse();
    const closes=candles.map(x=>Number(x.close)).filter(Number.isFinite);
    const price=closes.at(-1);
    const fast=ema(closes,9), slow=ema(closes,21), rv=rsi(closes,14);
    let score=50;
    if(fast && slow) score += fast>slow ? 18 : -18;
    if(rv>55) score+=12; else if(rv<45) score-=12;
    const action=score>=68 ? "BUY" : score<=32 ? "SELL" : "WAIT";
    const atrApprox = Math.max(price*0.0015, Math.abs(price-(closes.at(-2)||price))*4);
    const sl = action==="BUY" ? price-atrApprox : action==="SELL" ? price+atrApprox : null;
    const tp1 = action==="BUY" ? price+atrApprox*1.5 : action==="SELL" ? price-atrApprox*1.5 : null;
    const tp2 = action==="BUY" ? price+atrApprox*2.4 : action==="SELL" ? price-atrApprox*2.4 : null;
    res.json({
      pair,timeframe:interval, action, confidence:Math.min(95,Math.max(50,Math.round(action==="WAIT"?100-Math.abs(score-50):Math.abs(score-50)+65))),
      price, entry:price, stopLoss:sl, takeProfit1:tp1, takeProfit2:tp2,
      indicators:{ema9:fast,ema21:slow,rsi:rv},
      updatedAt:new Date().toISOString(),
      reason:`EMA9/EMA21 trend + RSI momentum. RSI ${rv.toFixed(1)}.`
    });
  } catch(e) {
    res.status(503).json({error:e.message});
  }
});

app.listen(PORT,()=>console.log(`AI Signal Live backend on :${PORT}`));
