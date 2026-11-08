(() => {
'use strict';
const INTERVALS = [1, 3, 7, 14, 30];
function dateKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function addDays(key, n) { const [y,m,d] = key.split('-').map(Number); return dateKey(new Date(y,m-1,d+n,12)); }
function isDue(w, day) { return !w.started || w.pending.some(d=>d<=day); }
function mastered(w) { return !!w.started && w.pending.length===0; }
function answerWord(w, correct, day, mode='study') {
 const next = {...w, pending:[...w.pending], correct:w.correct+(correct?1:0), wrong:w.wrong+(correct?0:1)};
 if(mode==='random') return next;
 if(correct && !w.started) { next.started=day; next.pending=INTERVALS.map(n=>addDays(day,n)); }
 else { next.pending=next.pending.filter(d=>d>day); if(!correct) { next.started ||= null; next.pending.push(addDays(day,1)); } }
 // New words with a failed attempt are due tomorrow, rather than immediately again.
 if(!correct && !w.started) next.started='retry';
 if(correct && w.started==='retry') { next.started=day; next.pending=INTERVALS.map(n=>addDays(day,n)); }
 next.pending=[...new Set(next.pending)].sort(); return next;
}
function weightedPick(words, previousId, rng=Math.random) {
 const pool=words.length>1?words.filter(w=>w.id!==previousId):words;
 if(!pool.length) return null;
 const weights=pool.map(w=>mastered(w)?0.15:1+4*(w.wrong+1)/(w.correct+w.wrong+2));
 let r=rng()*weights.reduce((a,b)=>a+b,0);
 return pool.find((w,i)=>(r-=weights[i])<0)||pool.at(-1);
}
function normalize(s) { return s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' '); }
function checkAnswer(word, input) { return word.meaning.split('|').some(a=>normalize(a)===normalize(input)); }
function parseCSV(text) {
 text=text.replace(/^\uFEFF/,''); const rows=[]; let row=[], cell='', quoted=false, ended=false;
 for(let i=0;i<text.length;i++) {const c=text[i];
  if(quoted) { if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"'){quoted=false;ended=true;}else cell+=c; }
  else if(c==='"'){if(cell||ended)throw Error('引用符の位置が正しくありません。');quoted=true;}
  else if(c===','||c==='\n'||c==='\r'){row.push(cell);cell='';ended=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(v=>v.trim()))rows.push(row);row=[];}}
  else {if(ended&&!/\s/.test(c))throw Error('閉じ引用符の後に不正な文字があります。');if(!ended)cell+=c;}
 }
 if(quoted)throw Error('CSVの引用符が閉じていません。');row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
 if(rows.length<2)throw Error('ヘッダーと単語データが必要です。');
 const header=rows.shift().map(v=>v.trim().toLowerCase());const wi=header.indexOf('word'),mi=header.indexOf('meaning'),ei=header.indexOf('example');
 if(wi<0||mi<0)throw Error('word と meaning のヘッダーが必要です。');
 if(rows.length>10000)throw Error('一度に取り込めるのは10,000語までです。');
 return rows.map((r,i)=>{const word=r[wi]?.trim(),meaning=r[mi]?.trim(),example=ei<0?'':(r[ei]||'').trim();if(!word||!meaning||!meaning.split('|').every(a=>a.trim()))throw Error(`${i+2}行目のwordまたはmeaningが空です。`);if(word.length>200||meaning.length>2000||example.length>4000)throw Error(`${i+2}行目の文字数が長すぎます。`);return {word,meaning,example};});
}
function validateBackup(data) {
 const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&addDays(d,0)===d;
 if(data?.version!==1||!Array.isArray(data.words)||data.words.length>50000||!Array.isArray(data.history))throw Error('バックアップの形式が正しくありません。');
 const ids=new Set();for(const w of data.words){if(typeof w.id!=='string'||ids.has(w.id)||typeof w.word!=='string'||!w.word.trim()||typeof w.meaning!=='string'||!w.meaning.trim()||typeof w.example!=='string'||![w.correct,w.wrong].every(n=>Number.isSafeInteger(n)&&n>=0)||!Array.isArray(w.pending)||!w.pending.every(validDate)||!(w.started===null||w.started==='retry'||validDate(w.started)))throw Error('単語データが不正です。');ids.add(w.id);}
 if(!data.history.every(h=>validDate(h.day)&&typeof h.correct==='boolean'&&typeof h.wordId==='string'&&['study','random'].includes(h.mode)))throw Error('履歴データが不正です。');return data;
}

globalThis.KotonohaCore = { INTERVALS, dateKey, addDays, isDue, mastered, answerWord, weightedPick, normalize, checkAnswer, parseCSV, validateBackup };
})();

