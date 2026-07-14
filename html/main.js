//TypeWriter Effect for Name
const nameh1 = document.getElementById("name");

var i = 0;
var txt = './Daniel_Kennedy_';
var speed = 75;
function typeWriter() {
    if (i < txt.length) {
        nameh1.innerHTML += txt.charAt(i);
        i++;
        setTimeout(typeWriter, speed);
    }else{
        setTimeout(() => {
            nameh1.classList.add("text-teal-200");
            setTimeout(showSection, 400);
        }, 400);
    }
}

//Fade in sections
const sections = document.querySelectorAll("#sections > section"); 
function showSection(){
    setTimeout(showTechs, 800);
    let i = 0;
    setInterval(() => {
        if(i < sections.length){
            sections[i].classList.add("visible", "animate-fade-down", "animate-once", "animate-ease-out");
            i++;
        }
    }, 100);
    setTimeout(showContactButtons, 300);
}

//Fade in contact buttons
const contactButtons = document.querySelectorAll("#contact > a");
function showContactButtons(){
    let i = 0;
    var contactFadein = setInterval(() => {
        if(i < contactButtons.length){
            contactButtons[i].classList.add("visible", "animate-fade-left", "animate-once", "animate-ease-out");
            i++;
        }else{
            clearInterval(contactFadein);
        }
    }, 100);
    
    setTimeout(() => {
        let i = 0;
        var contactAnimations = setInterval(() => {
            if(i < contactButtons.length){ 
                contactButtons[i].classList.remove("animate-fade-left", "animate-once", "animate-ease-out");
                i++;
            }else{
                clearInterval(contactAnimations);
            }
        }, 100);

    }, 100*contactButtons.length + 200);
};

//Fade in techs
const techs = document.querySelectorAll("#techs > i");
function showTechs(){
    let i = 0;
    var techFadein = setInterval(() => {
        if(i < techs.length){
            techs[i].classList.remove("invisible");
            techs[i].classList.add("visible", "animate-fade-right", "animate-once", "animate-ease-out");
            i++;
        }else{
            clearInterval(techFadein);
        }
    }, 200);
};

setTimeout(typeWriter, 600);
