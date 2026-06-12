import sqlite3
import os

indian_names = [
    # A
    "aarav", "aarush", "aaditya", "advait", "arjun", "amit", "anil", "abhishek", "aditya", "akash", 
    "alok", "aniruddh", "anand", "ajit", "amar", "anuj", "ashwin", "abhay", "aditi", "aadya", 
    "ananya", "anjali", "aisha", "amrita", "archana", "avani", "asha", "aruna", "alka", "anila",
    # B
    "baldev", "bhuvan", "bhupesh", "bharat", "bhaskar", "balraj", "bimal", "binod", "balram", "bhim", 
    "babita", "bina", "bhumika", "bharati", "bhairavi", "bhavna", "barkha", "bindiya",
    # C
    "chirag", "chandan", "chetan", "chinmay", "chandrashekhar", "charan", "chaitanya", "charu", "chitra", 
    "chandni", "chetna", "chaitali", "chhaya",
    # D
    "dhruv", "dev", "deepak", "dinesh", "dilip", "devendra", "divyesh", "darshan", "dharmendra", "dushyant", 
    "damodar", "divya", "deepika", "deepti", "diya", "drishti", "dolly", "devika", "durga",
    # E
    "ekansh", "eklavya", "eshwar", "ehsaan", "esha", "ekta", "eshita", "ela",
    # G
    "ganesh", "gautam", "gaurav", "girish", "gopal", "govind", "gagan", "gurnam", "gurpreet", "gulshan", 
    "geeta", "gayatri", "gauri", "garima", "ganga", "gita", "gunjan",
    # H
    "harish", "hari", "himanshu", "hardik", "hiten", "hemant", "harsh", "hrithik", "hrishikesh", "harsha", 
    "hema", "himani", "harini", "hina", "hazel",
    # I
    "ishan", "indrajit", "imran", "inder", "iqbal", "ishaan", "ishani", "ishita", "indira", "indu", 
    "ira", "isha",
    # J
    "jay", "jitendra", "jatin", "jagdish", "jaspreet", "joy", "jaideep", "jeevan", "jugal", "jyoti", 
    "jaya", "jiya", "jasmeet", "janhavi", "juhi", "jagruti",
    # K
    "kabir", "kunal", "kartik", "karan", "kiran", "kushal", "kishore", "krishna", "kamlesh", "kailash", 
    "kedar", "kavita", "kajal", "karishma", "komal", "kriti", "kirti", "kalyani", "kusuma", "kanchana",
    # L
    "lalit", "lokesh", "lakshman", "lakshay", "luv", "lavanya", "lata", "leela", "lipika", "lekha", "laxmi",
    # M
    "manoj", "manish", "mahendra", "madhav", "mayank", "mukund", "mohan", "mahesh", "manpreet", "manav", 
    "mithun", "meera", "manju", "madhuri", "malini", "mamta", "monica", "mona", "mansi", "mahima", 
    "megha", "meenal",
    # N
    "nitin", "nikhil", "naveen", "naman", "nishant", "naresh", "niraj", "narendra", "nitesh", "neeraj", 
    "neha", "nidhi", "nikita", "nisha", "namrata", "nandini", "nayantara", "neeta", "nupur",
    # O
    "om", "ojas", "omkar", "omveer", "oviya", "oshi", "omana",
    # P
    "priya", "priyanka", "pooja", "poonam", "preeti", "payal", "pallavi", "prerna", "parul", "prisha", 
    "pankaj", "pranav", "puneet", "piyush", "pawan", "prakash", "pramod", "prasanna", "pradeep", "pratap", 
    "prem",
    # R
    "rahul", "rohan", "rohit", "raj", "rajesh", "ramesh", "rakesh", "rishi", "ram", "ranveer", 
    "ranbir", "ritesh", "raghav", "raman", "riya", "ritu", "richa", "rashmi", "rekha", "radhika", 
    "rupa", "rani", "roshni", "raveena", "rupal", "reema",
    # S
    "sachin", "saurabh", "sunil", "sanjay", "sandeep", "suresh", "sameer", "sumit", "siddharth", "shailendra", 
    "shekhar", "shiv", "sunny", "sneha", "shruti", "swati", "shreya", "simran", "sonali", "shalini", 
    "sunita", "seema", "shweta", "shilpa", "sadhana", "sarita", "suman", "sonia",
    # T
    "tarun", "tushar", "tanmay", "trilok", "tejas", "trupti", "tanvi", "tanya", "tina", "trisha", 
    "tara",
    # U
    "uday", "utkarsh", "umang", "umesh", "upendra", "ujwal", "usha", "uma", "urvashi", "upasana", 
    "urvi",
    # V
    "vikram", "vivek", "varun", "vijay", "vinay", "vikas", "vipul", "vishal", "vineet", "vansh", 
    "veer", "vinod", "vidya", "vani", "vaishali", "varsha", "vandana", "veena", "vibha", "vrinda",
    # Y
    "yash", "yuvraj", "yogesh", "yudhisthir", "yamini", "yashika", "yuvika",
    # Z
    "zain", "zafar", "zeeshan", "zakir", "zoya", "zara", "zeenat"
]

data_dir = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(data_dir, 'dictionary.db')

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

records = [(w, 'name') for w in set(indian_names)]
cursor.executemany('INSERT OR IGNORE INTO words (word, category) VALUES (?, ?)', records)

conn.commit()
print(f"Successfully added/validated {len(records)} Indian names in the 'name' category.")
conn.close()
