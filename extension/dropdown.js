import {getStoredCrumbs} from "./getStoredCrumbs.js"
import { editCrumbs } from "./editcrumbs.js";
const gearBtn = document.getElementById("gearBtn");
const dropdown = document.getElementById("settingsDropdown");
let memoryData = [];
let currentLevel = "topic";
let selectedTopic = "";
let selectedSubTopic = "";
let editMode = false;

function getAvailableTopics() {
    return [...new Set(memoryData.map(x => x.topic))];
}

function getAvailableSubtopics(topic) {
    return [...new Set(
        memoryData
            .filter(x => x.topic === topic)
            .map(x => x.sub_topic)
    )];
}
gearBtn.onclick = () => {
    if (dropdown.style.display === "block") {
        dropdown.style.display = "none";
    } else {
        dropdown.style.display = "block";
    }
};

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

    const data = await getStoredCrumbs(); 

    await openMemory(data);
});
async function openMemory(data) {
    memoryData = data;
    currentLevel = "topic";

    document.getElementById("memoryOverlay").classList.remove("hidden");
    await renderTopics();
}
async function renderTopics() {
    currentLevel = "topic";
    document.getElementById("memoryTitle").innerText = "Topics";

    const topics = [...new Set(memoryData.map(x => x.topic))];

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
                    renderTopics();
                    await editCrumbs({"type":"topic","action":"delete","prevTopic": topic,"topic":"skip"})
                    
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
            editBtn.className = "cell-btn edit-btn";
            editBtn.innerHTML = '<i class="fas fa-pen-to-square"></i>'; 
            editBtn.title = "Edit";
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
            delBtn.className = "cell-btn delete-btn";
            delBtn.innerHTML = '<i class="fas fa-trash-can"></i>'; 
            delBtn.title = "Delete";
            delBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Delete "${sub}"?`)) {
                    memoryData = memoryData.filter(item => !(item.topic === selectedTopic && item.sub_topic === sub));
                    renderSubTopics();
                    await editCrumbs({"type":"subtopic","action":"delete","prevTopic": selectedTopic,"subtopic": sub})
                    
                }
            };
            const btnContainer = document.createElement("div");
            btnContainer.className = "cell-buttons";
            const moveBtn = document.createElement("button");
            moveBtn.className = "cell-btn move-btn";
            moveBtn.innerHTML = '<i class="fas fa-arrow-right-arrow-left"></i>'; 
            moveBtn.title = "Move this item";
            moveBtn.onclick = async (e) => {
                e.stopPropagation();
                const topics = getAvailableTopics();
                const currentTopic = selectedTopic;
                
                let topicList = topics.map((t, idx) => `${idx + 1}. ${t}`).join("\n");
                const newTopic = prompt(
                    `Move "${sub}" to which topic?\n\nAvailable topics:\n${topicList}\n\nEnter topic name exactly as shown:`,
                    currentTopic
                );
                
                if (newTopic && newTopic !== currentTopic && topics.includes(newTopic)) {
                    memoryData.forEach((item) => {
                        if (item.topic === currentTopic && item.sub_topic === sub) {
                            item.topic = newTopic;
                        }
                    });
                    renderTopics();
                    
                    await editCrumbs({
                        "type": "subtopic",
                        "action": "move_to_topic",
                        "prevTopic": currentTopic,
                        "subtopic": sub,
                        "newTopic": newTopic
                    });
                    
                    
                } else if (newTopic && !topics.includes(newTopic)) {
                    alert("Topic not found!");
                }
            };
            btnContainer.appendChild(moveBtn);
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
        div.className = editMode ?"memory-cell edit-mode":"memory-cell sub-topic-cell";
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
                if (originalIndex !== -1) {
                    let old_question = memoryData[originalIndex].question
                    let old_fact = memoryData[originalIndex].fact
                    memoryData[originalIndex].question = newQuestion;
                    memoryData[originalIndex].fact = newFact;
                
                    renderFacts();

                    await editCrumbs({
                            "type": "fact",
                            "action": "edit",
                            "prevTopic": selectedTopic,
                            "subtopic": selectedSubTopic,
                            "oldQuestion": old_question,
                            "oldFact": old_fact,
                            "newQuestion": newQuestion,
                            "newFact": newFact
                        });
                }

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
            const moveBtn = document.createElement("button");
            moveBtn.innerText = "➡️";
            moveBtn.className = "cell-btn move-btn";
            moveBtn.title = "Move this fact to another subtopic";
            moveBtn.onclick = async (e) => {
                e.stopPropagation();
                const subtopics = getAvailableSubtopics(selectedTopic);
                const currentSubtopic = selectedSubTopic;
                
                let subtopicList = subtopics.map((st, idx) => `${idx + 1}. ${st}`).join("\n");
                const newSubtopic = prompt(
                    `Move fact "${f.question}" to which subtopic?\n\nAvailable subtopics in "${selectedTopic}":\n${subtopicList}\n\nEnter subtopic name exactly as shown:`,
                    currentSubtopic
                );
                
                if (newSubtopic && newSubtopic !== currentSubtopic && subtopics.includes(newSubtopic)) {
                    const originalIndex = memoryData.findIndex(x => 
                        x.topic === selectedTopic && 
                        x.sub_topic === currentSubtopic &&
                        x.question === f.question &&
                        x.fact === f.fact
                    );
                    
                    if (originalIndex !== -1) {
                        memoryData[originalIndex].sub_topic = newSubtopic;
                        renderFacts();  // Re-render current view
                        
                        await editCrumbs({
                            "type": "fact",
                            "action": "move_to_subtopic",
                            "prevTopic": selectedTopic,
                            "oldSubtopic": currentSubtopic,
                            "newSubtopic": newSubtopic,
                            "question": f.question,
                            "fact": f.fact
                        });
                    }
                } else if (newSubtopic && !subtopics.includes(newSubtopic)) {
                    alert("Subtopic not found!");
                }
            };
            const btnContainer = document.createElement("div");
            btnContainer.className = "cell-buttons";


            btnContainer.appendChild(editBtn);
            btnContainer.appendChild(deleteBtn);
            btnContainer.appendChild(moveBtn);

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