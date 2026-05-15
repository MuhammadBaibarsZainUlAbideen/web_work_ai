import {getStoredCrumbs} from "./getStoredCrumbs.js"
const gearBtn = document.getElementById("gearBtn");
const dropdown = document.getElementById("settingsDropdown");
let memoryData = [];
let currentLevel = "topic";
let selectedTopic = "";
let selectedSubTopic = "";

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

    topics.forEach(topic => {
        const div = document.createElement("div");
        div.className = "memory-cell";
        div.innerText = topic;

        div.onclick = async () => {
            selectedTopic = topic;
            await renderSubTopics();
        };

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
        div.className = "memory-cell";
        div.innerText = sub;

        div.onclick = async () => {
            selectedSubTopic = sub;
            await renderFacts();
        };

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
        div.className = "memory-cell sub-topic-cell";

        div.innerHTML = `
            <b>${f.question}</b><br>
            <small>${f.fact}</small>
        `;

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