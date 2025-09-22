# 🖼️ Ghid pentru Accesarea Imaginilor în Sistemul de Examene

## Descriere

Sistemul de management pentru școala de șoferi include **1008 întrebări de examen** cu **631 imagini** organizate în 42 de bilete practice (B1-B42). Aceste imagini sunt stocate pe server și pot fi accesate prin browser.

---

## 🔧 Configurarea Realizată

### **1. Serviciul Static de Fișiere**
- ✅ **Directorul imagini**: `/EXAMEN_INSTRUIRE_AUTO/`
- ✅ **URL Prefix**: `/images/`
- ✅ **Format suportat**: PNG, JPEG
- ✅ **CORS configurat** pentru domeniile autorizate

### **2. Service de Management Imagini**
- ✅ **ImageService**: Convertește căile relative în URL-uri complete
- ✅ **Integrare automată**: Toate endpoint-urile returnează `imageUrl` complet

---

## 🌐 Cum să Accesezi Imaginile în Browser

### **Format URL General:**
```
https://instruireauto.site/images/{TICKET}/{QUESTION_NUMBER}/{IMAGE_FILE}
```

### **Exemplu Concret:**
```
https://instruireauto.site/images/B1/3/image4.png
```

### **Structura Directoarelor:**
```
EXAMEN_INSTRUIRE_AUTO/
├── B1/
│   ├── 3/
│   │   └── image4.png
│   ├── 4/
│   │   └── image6.jpeg
│   └── ...
├── B2/
├── B3/
└── ...
```

---

## 🎯 Utilizarea prin API

### **1. Obține Întrebări cu Imagini**

#### **GET /api/exams/questions**
```json
{
  "data": [
    {
      "id": 3037,
      "text": "Indicatorul din imagine, instalat în localitate...",
      "image": "EXAMEN_INSTRUIRE_AUTO/B1/3/image4.png",
      "imageUrl": "https://instruireauto.site/images/B1/3/image4.png",
      "answers": ["Varianta 1", "Varianta 2", "Varianta 3", "Varianta 4"],
      "correctAnswer": 1
    }
  ]
}
```

#### **GET /api/exams/questions/:id**
```json
{
  "id": 3037,
  "text": "Indicatorul din imagine...",
  "image": "EXAMEN_INSTRUIRE_AUTO/B1/3/image4.png",
  "imageUrl": "https://instruireauto.site/images/B1/3/image4.png",
  "answers": ["Varianta 1", "Varianta 2", "Varianta 3", "Varianta 4"],
  "correctAnswer": 1
}
```

### **2. Practică cu Imagini**

#### **GET /api/exams/practice/:id**
```json
{
  "id": 1,
  "ticketName": "Biletul B1",
  "status": "IN_PROGRESS",
  "questions": [
    {
      "id": 3037,
      "text": "Indicatorul din imagine...",
      "image": "EXAMEN_INSTRUIRE_AUTO/B1/3/image4.png",
      "imageUrl": "https://instruireauto.site/images/B1/3/image4.png",
      "answers": ["Varianta 1", "Varianta 2", "Varianta 3", "Varianta 4"],
      "order": 1,
      "selectedAnswer": null,
      "isCorrect": null,
      "isAnswered": false
    }
  ]
}
```

---

## 🔍 Testarea Accesului la Imagini

### **1. Test Manual în Browser**
```bash
# Accesează direct în browser:
https://instruireauto.site/images/B1/3/image4.png
```

### **2. Test cu cURL**
```bash
curl -I https://instruireauto.site/images/B1/3/image4.png
# Ar trebui să returneze: HTTP/1.1 200 OK
```

### **3. Verificare în Aplicația Frontend**
```javascript
// Exemplu React
const QuestionImage = ({ imageUrl }) => {
  return (
    <img 
      src={imageUrl} 
      alt="Întrebare examen"
      onError={(e) => {
        console.error('Eroare la încărcarea imaginii:', imageUrl);
        e.target.style.display = 'none';
      }}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
};

// Utilizare
<QuestionImage imageUrl="https://instruireauto.site/images/B1/3/image4.png" />
```

---

## 📱 Integrare Frontend

### **React Hook pentru Întrebări**
```javascript
const useQuestionWithImage = (questionId) => {
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/exams/questions/${questionId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setQuestion(data);
      setLoading(false);
    })
    .catch(err => {
      console.error('Eroare:', err);
      setLoading(false);
    });
  }, [questionId]);

  return { question, loading };
};
```

### **Componenta Întrebare Completă**
```javascript
const ExamQuestion = ({ questionId }) => {
  const { question, loading } = useQuestionWithImage(questionId);

  if (loading) return <div>Se încarcă...</div>;

  return (
    <div className="exam-question">
      <h3>{question.text}</h3>
      
      {question.imageUrl && (
        <div className="question-image">
          <img 
            src={question.imageUrl} 
            alt="Imagine întrebare"
            style={{ maxWidth: '400px', marginBottom: '20px' }}
          />
        </div>
      )}
      
      <div className="answers">
        {question.answers.map((answer, index) => (
          <label key={index} className="answer-option">
            <input 
              type="radio" 
              name="answer" 
              value={index}
              onChange={() => handleAnswerSelect(index)}
            />
            {answer}
          </label>
        ))}
      </div>
    </div>
  );
};
```

---

## 🛡️ Securitate și Performanță

### **1. Protecție Imagini**
- ✅ **CORS configurat** pentru domeniile autorizate
- ✅ **Rate limiting** pe server
- ✅ **Cache headers** pentru performanță optimă

### **2. Optimizări**
- ✅ **Lazy loading** pentru imagini mari
- ✅ **Fallback** pentru imagini lipsă
- ✅ **Compression** activată pe Nginx

### **3. Gestionarea Erorilor**
```javascript
const ImageWithFallback = ({ src, alt, ...props }) => {
  const [error, setError] = useState(false);

  if (error) {
    return <div className="image-placeholder">Imagine indisponibilă</div>;
  }

  return (
    <img 
      src={src}
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  );
};
```

---

## 📊 Statistici Imagini

### **Date Curente:**
- 📁 **Total întrebări**: 1,008
- 🖼️ **Întrebări cu imagini**: 631
- 📂 **Bilete**: 42 (B1-B42)
- 💾 **Formate**: PNG, JPEG
- 🔗 **URL-uri generate automat**: Da

### **Structura pe Bilete:**
- Fiecare bilet (B1-B42) conține întrebări numerotate
- Imaginile sunt organizate după bilet și numărul întrebării
- Toate imaginile au URL-uri accesibile public

---

## 🔧 Depanare Probleme Comune

### **Problema: Imaginea nu se încarcă**
```javascript
// Verifică URL-ul complet
console.log('URL imagine:', question.imageUrl);

// Testează accesul direct
fetch(question.imageUrl)
  .then(response => {
    if (!response.ok) {
      console.error('Eroare HTTP:', response.status);
    }
  });
```

### **Problema: CORS Errors**
- Verifică că domeniul tău este în lista CORS
- URL-urile trebuie să înceapă cu `https://instruireauto.site`

### **Problema: Imagini lipsă**
- Folosește field-ul `imageUrl` din răspunsul API
- Implementează fallback pentru cazurile când `imageUrl` este `null`

---

## 📞 Suport

Pentru probleme tehnice legate de imagini:
1. **Verifică network tab** în browser pentru erorile de încărcare
2. **Testează URL-ul direct** în browser
3. **Consultă logs PM2** pentru erori server: `pm2 logs instruire-auto-api--prod`

Sistemul de imagini este complet funcțional și optimizat pentru performanță! 🎯