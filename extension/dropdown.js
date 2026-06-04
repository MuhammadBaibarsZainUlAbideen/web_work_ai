import {getStoredCrumbs} from "./getStoredCrumbs.js"
import { editCrumbs } from "./editcrumbs.js";
const gearBtn = document.getElementById("gearBtn");
const dropdown = document.getElementById("settingsDropdown");
let memoryData = [];
let currentLevel = "topic";
let selectedTopic = "";
let selectedSubTopic = "";
let editMode = false;

// toggle dropdown
gearBtn.onclick = () => {
    if (dropdown.style.display === "block") {
        dropdown.style.display = "none";
    } else {
        dropdown.style.display = "block";
    }
};

// close when clicking outside
document.addEventListener("click", (e) => {
    if (!gearBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
    }
});




document.getElementById("editModeBtn").addEventListener("click", () => {
    editMode = !editMode;
    if (currentLevel === "topic") renderTopics();
    else if (currentLevel === "subtopic") renderSubTopics();
    else if (currentLevel === "facts") renderFacts();
});

document.getElementById("memoryBtn").addEventListener("click", async() => {
    console.log("12")

    const data = await getStoredCrumbs(); 
    // let data = [{ topic: "Math", sub_topic: "Trig" ,"question":"what is sin(inf)",fact: "bab"},
    //             { topic: "Physics", sub_topic: "Motion" }

    // ]

    await openMemory(data);
});
async function openMemory(data) {
    memoryData = data;
    currentLevel = "topic";

    document.getElementById("memoryOverlay").classList.remove("hidden");
    await renderTopics();
}
async function renderTopics() {
    document.getElementById("memoryTitle").innerText = "Topics";

    const topics = [...new Set(memoryData.map(x => x.topic))];
    console.log(topics);

    const container = document.getElementById("memoryContent");
    container.innerHTML = "";
    topics.forEach((topic) => {
        const div = document.createElement("div");
        div.className = editMode ? "memory-cell edit-mode" : "memory-cell";;
        div.innerText = topic;
        
        if (!editMode) {
            div.onclick = async () => {
                selectedTopic = topic;
                await renderSubTopics();
            };
        }
        
        if (editMode) {
            const editBtn = document.createElement("button");
            editBtn.innerText = "✏️";
            editBtn.className = "cell-btn edit-btn";
            editBtn.onclick = (async (e) => {
                e.stopPropagation();
                const newName = prompt("Edit topic:", topic);
                if (newName) {
                    memoryData.forEach ((item) => {
                        if (item.topic === topic) item.topic = newName;
                        
                    });
                    renderTopics();
                    await editCrumbs({"type":"topic","action":"edit","prevTopic": topic,"topic":newName})
                    
                    
                    
                }
            });
            
            const delBtn = document.createElement("button");
            delBtn.innerText = "🗑️";
            delBtn.className = "cell-btn delete-btn";
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Delete "${topic}"?`)) {
                    memoryData = memoryData.filter(item => item.topic !== topic);
                    await editCrumbs({"type":"topic","action":"delete","prevTopic": topic,"topic":"skip"})
                    renderTopics();
                }
            };
            const btnContainer = document.createElement("div");
            btnContainer.className = "cell-buttons";

            btnContainer.appendChild(editBtn);
            btnContainer.appendChild(delBtn);

            div.appendChild(btnContainer);
        }
        
        container.appendChild(div);
    });

}
async function renderSubTopics() {
    currentLevel = "subtopic";
    document.getElementById("memoryTitle").innerText = selectedTopic;

    const subtopics = [...new Set(
        memoryData
            .filter(x => x.topic === selectedTopic)
            .map(x => x.sub_topic)
    )];

    const container = document.getElementById("memoryContent");
    container.innerHTML = "";

    subtopics.forEach(sub => {
        const div = document.createElement("div");
        div.className = editMode ? "memory-cell edit-mode" : "memory-cell";;
        div.innerText = sub;

        if (!editMode) {
            div.onclick = async () => {
                selectedSubTopic = sub;
                await renderFacts();
            };
        }

        if (editMode) {
            const editBtn = document.createElement("button");
            editBtn.innerText = "✏️";
            editBtn.className = "cell-btn edit-btn";
            editBtn.onclick = async (e) => {
                e.stopPropagation();
                const newName = prompt("Edit subtopic:", sub);
                if (newName) {
                    memoryData.forEach((item) => {
                        if (item.topic === selectedTopic && item.sub_topic === sub) item.sub_topic = newName;
                    });
                    renderSubTopics();
                    await editCrumbs({"type":"subtopic","action":"edit","prevTopic": selectedTopic,"subtopic": sub, "newSubtopic": newName})
                }
            };
            
            const delBtn = document.createElement("button");
            delBtn.innerText = "🗑️";
            delBtn.className = "cell-btn delete-btn";
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Delete "${sub}"?`)) {
                    memoryData = memoryData.filter(item => !(item.topic === selectedTopic && item.sub_topic === sub));
                    await editCrumbs({"type":"subtopic","action":"delete","prevTopic": selectedTopic,"subtopic": sub})
                    renderSubTopics();
                }
            };
            const btnContainer = document.createElement("div");
            btnContainer.className = "cell-buttons";

            btnContainer.appendChild(editBtn);
            btnContainer.appendChild(delBtn);

            div.appendChild(btnContainer);
        }

        container.appendChild(div);
    });
}
async function renderFacts() {
    currentLevel = "facts";
    document.getElementById("memoryTitle").innerText = selectedSubTopic;

    const facts = memoryData.filter(x =>
        x.topic === selectedTopic &&
        x.sub_topic === selectedSubTopic
    );

    const container = document.getElementById("memoryContent");
    container.innerHTML = "";

    facts.forEach(f => {
        const div = document.createElement("div");
        div.className = editMode ?"memory-cell edit-mode sub-topic-cell":"memory-cell sub-topic-cell";
        if (!editMode) {
            div.innerHTML = `
                <b>${f.question}</b><br>
                <small>${f.fact}</small>
            `;
        }
        if (editMode){
            div.innerHTML = `
                <b>${f.question}</b><br>
                <small>${f.fact}</small>
            `;
            const editBtn = document.createElement("button");
            editBtn.innerText = "✏️";
            editBtn.className = "cell-btn edit-btn";
            editBtn.onclick = async (e) =>{
                e.stopPropagation();
                const newQuestion = prompt("Edit question:", f.question);
                const newFact = prompt("Edit fact:", f.fact);
            
            if (newQuestion || newFact){
                const originalIndex = memoryData.findIndex(x => 
                        x.topic === selectedTopic && 
                        x.sub_topic === selectedSubTopic &&
                        x.question === f.question &&
                        x.fact === f.fact
                );

                await editCrumbs({
                        "type": "fact",
                        "action": "edit",
                        "prevTopic": selectedTopic,
                        "subtopic": selectedSubTopic,
                        "oldQuestion": f.question,
                        "oldFact": f.fact,
                        "newQuestion": newQuestion,
                        "newFact": newFact
                    });
                if (originalIndex !== -1) {
                        memoryData[originalIndex].question = newQuestion;
                        memoryData[originalIndex].fact = newFact;
                }
                renderFacts();
            }}
            const deleteBtn = document.createElement("button");
            deleteBtn.innerText = "🗑️";
            deleteBtn.className = "cell-btn delete-btn";
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm("Delete this fact?")) {
                    memoryData = memoryData.filter(x => 
                        x.question !== f.question || x.fact !== f.fact
                    );
                    renderFacts();
                    await editCrumbs({
                        "type": "fact",
                        "action": "delete",
                        "prevTopic": selectedTopic,
                        "subtopic": selectedSubTopic,
                        "question": f.question,
                        "fact": f.fact
                    });
                }
            };
            const btnContainer = document.createElement("div");
            btnContainer.className = "cell-buttons";

            btnContainer.appendChild(editBtn);
            btnContainer.appendChild(deleteBtn);

            div.appendChild(btnContainer);
        }
        


        container.appendChild(div);
    });
}
document.getElementById("backBtn").onclick = () => {
    if (currentLevel === "facts") renderSubTopics();
    else if (currentLevel === "subtopic") renderTopics();
};
document.getElementById("closeOverlay").onclick = () => {
    document.getElementById("memoryOverlay").classList.add("hidden");
};