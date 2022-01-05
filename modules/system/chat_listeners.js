import DSA5 from "./config-dsa5.js"
import DSA5_Utility from "./utility-dsa5.js"
import { showPatchViewer } from "./migrator.js"
import RuleChaos from "./rule_chaos.js"

export default class DSA5ChatListeners {
    static chatListeners(html) {
        html.on('click', '.chat-condition', ev => { DSA5ChatListeners.postStatus($(ev.currentTarget).attr("data-id")) })
        html.on('click', '.openJournalBrowser', () => game.dsa5.apps.journalBrowser.render(true))
        let helpButton = $(`<a class="button showHelp" title="${game.i18n.localize('HELP.showHelp')}"><i class="fas fa-question"></i></a>`)
        helpButton.click(() => { DSA5ChatListeners.getHelp() })
        $(html.find('.control-buttons')).prepend(helpButton)
        html.on('click', '.showPatchViewer', () => showPatchViewer())
        html.on('click', '.functionswitch', (ev) => RuleChaos[ev.currentTarget.dataset.function](ev))
    }

    static postStatus(id) {
        let effect = CONFIG.statusEffects.find(x => x.id == id)
        let msg = `<h2><a class="chat-condition chatButton" data-id="${id}"><img class="sender-image" style="background-color:black;margin-right: 8px;" src="${effect.icon}"/>${game.i18n.localize(effect.label)}</h2></a><p>${game.i18n.localize(effect.description)}</p>`
        ChatMessage.create(DSA5_Utility.chatDataSetup(msg, "roll"))
    }

    static getHelp() {
            let msg = DSA5.helpContent.map(x => `<h2>${game.i18n.localize(`HELP.${x.name}`)}</h2>
            <p><b>${game.i18n.localize("HELP.command")}</b>: ${x.command}</p>
            <p><b>${game.i18n.localize("HELP.example")}</b>: ${x.example}</p>
            <p><b>${game.i18n.localize("Description")}</b>: ${game.i18n.localize(`HELP.descr${x.name}`)}`).join("") + `<br>
            <p>${game.i18n.localize("HELP.default")}</p>`
        ChatMessage.create(DSA5_Utility.chatDataSetup(msg, "roll"))
    }

    static showConditions(){
        let effects = duplicate(CONFIG.statusEffects).map(x => {
            x.label = game.i18n.localize(x.label)
            return x
        }).sort((a, b) => { return a.label.localeCompare(b.label) })
        let msg = effects.map(x => `<a class="chat-condition chatButton" data-id="${x.id}"><img src="${x.icon}"/>${x.label}</a>`).join(" ")
        ChatMessage.create(DSA5_Utility.chatDataSetup(msg, "roll"))
    }

    static async check3D20(target, skill, options = {}){
        let attrs = 12
        if(target){
            target = target.get(0)
            skill = await DSA5_Utility.skillByName(target.textContent)
            if(target.dataset.attrs) attrs = target.dataset.attrs.split("|")
        }else if(skill){
            skill = await DSA5_Utility.skillByName(skill)
        }
        if(skill) skill= skill.toObject()

        if(!skill){
            skill = {
                name: "3d20",
                type: "skill",
                data: {
                    "talentValue": { "value": 0 },
                    "characteristic1": { "value": "mu" },
                    "characteristic2": { "value": "kl" },
                    "characteristic3": { "value": "in" },
                    "RPr": { "value": "no" },
                    "burden": { "value": "no" }
                }
            }
        }

        const actor = await DSA5_Utility.emptyActor(attrs)
        actor.setupSkill(skill, options, "emptyActor").then(setupData => {
            actor.basicTest(setupData)
        })
    }

    static showTables(){
        const msg = `<a class="roll-button botch-roll" data-table="Defense" data-weaponless="false"><i class="fas fa-dice"></i>${game.i18n.localize('TABLENAMES.Defense')}</a>
        <a class="roll-button botch-roll" data-table="Melee" data-weaponless="false"><i class="fas fa-dice"></i>${game.i18n.localize('TABLENAMES.Melee')}</a>
        <a class="roll-button botch-roll" data-table="Range" data-weaponless="false"><i class="fas fa-dice"></i>${game.i18n.localize('TABLENAMES.Range')}</a>
        <a class="roll-button botch-roll" data-table="Liturgy"><i class="fas fa-dice"></i>${game.i18n.localize('TABLENAMES.Liturgy')}</a>
        <a class="roll-button botch-roll" data-table="Spell"><i class="fas fa-dice"></i>${game.i18n.localize('TABLENAMES.Spell')}</a>`
        ChatMessage.create(DSA5_Utility.chatDataSetup(msg, "roll"))
    }
}