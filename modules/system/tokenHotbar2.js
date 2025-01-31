import Actordsa5 from "../actor/actor-dsa5.js";
import OnUseEffect from "./onUseEffects.js";
import Riding from "./riding.js";
import RuleChaos from "./rule_chaos.js";

export default class TokenHotbar2 extends Application {
    static registerTokenHotbar() {
        if (!game.dsa5.apps.tokenHotbar) game.dsa5.apps.tokenHotbar = new TokenHotbar2()
    }

    constructor(options) {
        super(options);

        this.combatSkills = ["selfControl", "featOfStrength", "bodyControl", "perception", "loyalty"].map(x => game.i18n.localize(`LocalizedIDs.${x}`))
        this.defaultSkills = [game.i18n.localize("LocalizedIDs.perception")]

        const parentUpdate = (source) => {
            const id = source.parent ? source.parent.id : undefined
            if (id) TokenHotbar2.hookUpdate(id)
        }

        Hooks.on("controlToken", (elem, controlTaken) => {
            this.updateDSA5Hotbar()
        })

        Hooks.on("updateActor", (actor, updates) => {
            TokenHotbar2.hookUpdate(actor.id)
        });

        Hooks.on("updateToken", (scene, token, updates) => {
            if (token._id == getProperty(game.dsa5.apps.tokenHotbar, "actor.prototypeToken.id"))
                this.updateDSA5Hotbar()
        });

        Hooks.on("updateOwnedItem", (source, item) => {
            TokenHotbar2.hookUpdate(source.data.id)
        });

        Hooks.on("createOwnedItem", (source, item) => {
            TokenHotbar2.hookUpdate(source.data.id)
        });

        Hooks.on("deleteOwnedItem", (source, item) => {
            TokenHotbar2.hookUpdate(source.data.id)
        });

        Hooks.on("updateItem", (source, item) => {
            parentUpdate(source)
        });

        Hooks.on("createItem", (source, item) => {
            parentUpdate(source)
        });

        Hooks.on("deleteItem", (source, item) => {
            parentUpdate(source)
        });
    }

    static hookUpdate(changeId) {
        if (changeId == getProperty(game.dsa5.apps.tokenHotbar, "actor.id"))
            game.dsa5.apps.tokenHotbar.updateDSA5Hotbar()
    }

    resetPosition() {
        const hotbarPosition = $('#hotbar').first().position()
        const itemWidth = game.settings.get("dsa5", "tokenhotbarSize")
        this.position.left = hotbarPosition.left + 8
        this.position.top = hotbarPosition.top - itemWidth - 25
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        const hotbarPosition = $('#hotbar').first().position()
        const itemWidth = game.settings.get("dsa5", "tokenhotbarSize")
        const position = game.settings.get("dsa5", "tokenhotbarPosition")

        mergeObject(options, {
            classes: options.classes.concat(["dsa5", "tokenQuickHot"]),
            itemWidth,
            resizable: false,
            height: itemWidth + 45,
            zIndex: 61,
            left: hotbarPosition.left + 8,
            top: hotbarPosition.top - itemWidth - 25,
            template: "systems/dsa5/templates/status/tokenHotbar.html",
            title: "TokenHotbar"
        });
        mergeObject(options, position)
        return options;
    }

    async _onWheelResize(ev) {
        let newVal = game.settings.get("dsa5", "tokenhotbarSize")
        if (ev.originalEvent.deltaY > 0) {
            newVal = Math.min(100, newVal + 5)
        } else {
            newVal = Math.max(15, newVal - 5)
        }
        await game.settings.set("dsa5", "tokenhotbarSize", newVal)
        await this.render(true)
    }

    async _cycleLayout(ev) {
        if (ev.button == 2) {
            let newVal = game.settings.get("dsa5", "tokenhotbarLayout") + 1
            if (newVal == 4) newVal = 0
            await game.settings.set("dsa5", "tokenhotbarLayout", newVal)
            await this.render(true)
        }
    }

    activateListeners(html) {
        super.activateListeners(html);
        const container = html.find(".dragHandler");
        new Draggable(this, html, container[0], this.options.resizable);

        container.on('wheel', async(ev) => {
            ev.stopPropagation()
            ev.preventDefault()
            await this._onWheelResize(ev)
            return false
        })

        container.on('mousedown', async(ev) => {
            await this._cycleLayout(ev)
        })

        html.on('mousedown', 'li', async(ev) => {
            ev.stopPropagation()
            await this.executeQuickButton(ev)
            return false
        })
                 
        html.on('mouseenter', 'li.primary', ev => {
            const cat = ev.currentTarget.dataset.category
            this.category = cat
            setTimeout(() => {
                html.find('.secondary').removeClass('shown')
                if(cat==this.category) 
                    html.find(`.secondary[data-category="${cat}"]`).addClass("shown")
            }, 700)
        })
        html.on('mouseleave', 'li.primary', ev => {
            const cat = ev.currentTarget.dataset.category
            this.category = undefined
            setTimeout(()=>{
                if(cat!=this.category) 
                    html.find(`.secondary[data-category="${cat}"]`).removeClass("shown")
            },50)
        })
    }

    async executeQuickButton(ev) {
        const actor = canvas.tokens.controlled[0].actor
        const tokenId = canvas.tokens.controlled[0].id
        const id = ev.currentTarget.dataset.id
        const subFunction = ev.currentTarget.dataset.subfunction
        switch (subFunction) {
            case "addEffect":
                AddEffectDialog.showDialog()
                break
            case "effect":
                const effect = actor.effects.get(id)
                const isSystemEffect = effect.getFlag("core", "statusId")
                if (ev.button == 0) {
                    if (isSystemEffect) await actor.addCondition(isSystemEffect, 1, false, false)
                    else effect.sheet.render(true)
                } else if (ev.button == 2) {
                    if (isSystemEffect) await actor.removeCondition(isSystemEffect, 1, false)
                    else await actor.sheet._deleteActiveEffect(id)
                }
                await this.render(true)
                break
            case "onUse":
                let item = actor.items.get(id)
                const onUse = new OnUseEffect(item)
                onUse.executeOnUseEffect()
                break
            default:
                if("rideLoyaltyID" == id){
                    Riding.rollLoyalty(actor)
                }
                else if ("attackWeaponless" == id) {
                    actor.setupWeaponless("attack", {}, tokenId).then(setupData => {
                        actor.basicTest(setupData)
                    });
                } else {
                    let result = actor.items.get(id)
                    if (result) {
                        if(ev.button == 2) return result.sheet.render(true)

                        switch (result.type) {
                            case "meleeweapon":
                            case "rangeweapon":
                            case "trait":
                                actor.setupWeapon(result, "attack", {}, tokenId).then(setupData => { actor.basicTest(setupData) });
                                break
                            case "liturgy":
                            case "spell":
                                actor.setupSpell(result, {}, tokenId).then(setupData => { actor.basicTest(setupData) });
                                break
                            case "skill":
                                actor.setupSkill(result, {}, tokenId).then(setupData => { actor.basicTest(setupData) })
                                break
                            case "consumable":
                                new Dialog({
                                    title: game.i18n.localize("SHEET.ConsumeItem") + ": " + result.name,
                                    content: game.i18n.localize("SHEET.ConsumeItem") + ": " + result.name,
                                    default: 'yes',
                                    buttons: {
                                        Yes: {
                                            icon: '<i class="fa fa-check"></i>',
                                            label: game.i18n.localize("yes"),
                                            callback: async() => {
                                                await result.setupEffect(null, {}, tokenId)
                                                await this.updateDSA5Hotbar()
                                            }
                                        },
                                        cancel: {
                                            icon: '<i class="fas fa-times"></i>',
                                            label: game.i18n.localize("cancel"),
                                        }
                                    }
                                }).render(true)
                                break
                        }

                    }
                }
        }
    }

    subWidth(items, itemWidth, defaultCount = 7) {
        return `style="width:${Math.ceil(items.length / defaultCount) * 200}px"`
    }

    async getData() {
        const data = await super.getData()
        const actor = this.actor
        const items = {
            attacks: [],
            spells: [],
            default: [],
            skills: []
        }
        let consumable
        let onUse
        const consumables = []
        const onUsages = []
        let effects = []
        const direction = game.settings.get("dsa5", "tokenhotbarLayout")
        const vertical = direction % 2
        const itemWidth = TokenHotbar2.defaultOptions.itemWidth
        const spellTypes = ["liturgy", "spell"]
        if (actor) {
            const moreSkills = []
            let moreSpells = []
            const isRiding = Riding.isRiding(actor)
            const rideName = game.i18n.localize("LocalizedIDs.riding")

            effects = (await actor.actorEffects()).map(x => { return { name: x.label, id: x.id, icon: x.icon, cssClass: "effect", abbrev: `${x.label[0]} ${x.getFlag("dsa5","value") || ""}`, subfunction: "effect" } })
            if (game.combat) {
                const combatskills = actor.items.filter(x => x.type == "combatskill").map(x => Actordsa5._calculateCombatSkillValues(x.toObject(), actor.system))
                const brawl = combatskills.find(x => x.name == game.i18n.localize('LocalizedIDs.wrestle'))
                if(brawl) {
                    items.attacks.push({
                        name: game.i18n.localize("attackWeaponless"),
                        id: "attackWeaponless",
                        icon: "systems/dsa5/icons/categories/attack_weaponless.webp",
                        attack: brawl.system.attack.value,
                        damage: "1d6"
                    })
                }
                
                const attacktypes = ["meleeweapon", "rangeweapon"]
                const traitTypes = ["meleeAttack", "rangeAttack"]         

                for (const x of actor.items) {
                    if (x.type == "trait" && traitTypes.includes(x.system.traitType.value)) {
                        const preparedItem = Actordsa5._parseDmg(x.toObject())
                        items.attacks.push({ name: x.name, id: x.id, icon: x.img, cssClass: `weapon ${x.id}`, abbrev: x.name[0], attack: x.system.at.value, damage: preparedItem.damagedie, dadd: preparedItem.damageAdd})
                    }
                    else if (attacktypes.includes(x.type) && x.system.worn.value == true) {
                        const preparedItem = x.type == "meleeweapon" ? Actordsa5._prepareMeleeWeapon(x.toObject(), combatskills, actor) : Actordsa5._prepareRangeWeapon(x.toObject(), [], combatskills, actor)
                        items.attacks.push({ name: x.name, id: x.id, icon: x.img, cssClass: `weapon ${x.id}`, abbrev: x.name[0], attack: preparedItem.attack, damage: preparedItem.damagedie, dadd: preparedItem.damageAdd })
                    } else if (spellTypes.includes(x.type)) {
                        if (x.system.effectFormula.value) items.spells.push({ name: x.name, id: x.id, icon: x.img, cssClass: "spell", abbrev: x.name[0] })
                        else moreSpells.push({ name: x.name, id: x.id, icon: x.img, cssClass: "spell", abbrev: x.name[0] })
                    } else if (["skill"].includes(x.type) && (this.combatSkills.some(y => x.name.startsWith(y)) || (isRiding && rideName == x.name))) {
                        items.default.push({ name: `${x.name} (${x.system.talentValue.value})`, id: x.id, icon: x.img, cssClass: "skill", abbrev: x.name[0] })
                    } 
                    else if (["skill"].includes(x.type)){
                        const elem = { name: `${x.name} (${x.system.talentValue.value})`, id: x.id, icon: x.img, cssClass: "skill",addClass: x.system.group.value, abbrev: x.name[0], tw: x.system.talentValue.value }
                        moreSkills.push(elem)
                    }
                    else if (x.type == "consumable") {
                        consumables.push({ name: x.name, id: x.id, icon: x.img, cssClass: "consumable", abbrev: x.system.quantity.value })
                    }

                    if (x.getFlag("dsa5", "onUseEffect")) {
                        onUsages.push({ name: x.name, id: x.id, icon: x.img, cssClass: "onUse", abbrev: x.name[0], subfunction: "onUse" })
                    }
                }
                consumable = consumables.pop()

                if(isRiding){
                    const horse = Riding.getHorse(actor)
                    if(horse){
                        const x = Riding.getLoyaltyFromHorse(horse)
                        if(x){
                            items.default.push({ name: `${x.name} (${x.system.talentValue.value})`, id: "rideLoyaltyID", icon: x.img, cssClass: "skill", abbrev: x.name[0] })
                        }
                    }
                }
            } else {
                let descendingSkills = []
                for (const x of actor.items) {
                    if (["skill"].includes(x.type) && (this.defaultSkills.includes(x.name)  || (isRiding && rideName == x.name))) {
                        items.default.push({ name: `${x.name} (${x.system.talentValue.value})`, id: x.id, icon: x.img, cssClass: "skill", abbrev: x.name[0] })
                    } else if (["skill"].includes(x.type)) {
                        const elem = { name: `${x.name} (${x.system.talentValue.value})`, id: x.id, icon: x.img, cssClass: "skill",addClass: x.system.group.value, abbrev: x.name[0], tw: x.system.talentValue.value }
                        if(x.system.talentValue.value > 0) descendingSkills.push(elem)

                        moreSkills.push(elem)
                    }else if (spellTypes.includes(x.type)) {
                        if (x.system.effectFormula.value) items.spells.push({ name: x.name, id: x.id, icon: x.img, cssClass: "spell", abbrev: x.name[0] })
                        else moreSpells.push({ name: x.name, id: x.id, icon: x.img, cssClass: "spell", abbrev: x.name[0] })
                    }

                    if (x.getFlag("dsa5", "onUseEffect")) {
                        onUsages.push({ name: x.name, id: x.id, icon: x.img, cssClass: "onUse", abbrev: x.name[0], subfunction: "onUse" })
                    }
                }
                items.skills.push(...descendingSkills.sort((a, b) => { return b.tw - a.tw }).slice(0, 5))
            }

            onUse = onUsages.pop()

            if (items.spells.length == 0 && moreSpells.length > 0) {
                items.spells.push(moreSpells.pop())
            }
            if (items.spells.length > 0 && moreSpells.length > 0) {
                items.spells[0].more = moreSpells.sort((a, b) => { return a.name.localeCompare(b.name) })
                items.spells[0].subwidth = this.subWidth(moreSpells, itemWidth)
            }
            if (items.default.length > 0 && moreSkills.length > 0) {
                items.default[0].more = moreSkills.sort((a, b) => { return a.addClass.localeCompare(b.addClass) || a.name.localeCompare(b.name) })
                items.default[0].subwidth = this.subWidth(moreSkills, itemWidth, 20)
            }

            if (consumable) {
                if (consumables.length > 0) {
                    consumable.more = consumables
                    consumable.subwidth = this.subWidth(consumables, itemWidth)
                }
                items.consumables = [consumable]
            }

            if (onUse) {
                if (onUsages.length > 0) {
                    onUse.more = onUsages
                    onUse.subwidth = this.subWidth(onUsages, itemWidth)
                }
                items.onUsages = [onUse]
            }
        }

        if (this.showEffects) {
            const label = game.i18n.localize("CONDITION.add")
            let effect = { name: label, id: "", icon: "icons/svg/aura.svg", cssClass: "effect", abbrev: label[0], subfunction: "addEffect" }
            if (effects.length > 0) {
                effect.more = effects
                effect.subwidth = this.subWidth(effects, itemWidth)
            }
            items.effects = [effect]
        }

        const count = Object.keys(items).reduce((prev, cur) => { return prev + items[cur].length }, 0)

        if (vertical) {
            this.position.width = itemWidth
            this.position.height = itemWidth * count + 14
        } else {
            this.position.width = itemWidth * count + 14
            this.position.height = itemWidth
        }

        mergeObject(data, { items, itemWidth, direction, count })
        return data
    }

    async render(force, options = {}) {
        const rend = await super.render(force, options)
        if (this._element) {
            this._element.css({ zIndex: 61 });
        }
        return rend
    }

    setPosition({ left, top, width, height, scale } = {}) {
        const currentPosition = super.setPosition({ left, top, width, height, scale })
        const el = this.element[0];

        if (!el.style.width || width) {
            const tarW = width || el.offsetWidth;
            const maxW = el.style.maxWidth || window.innerWidth;
            currentPosition.width = width = Math.clamped(tarW, 0, maxW);
            el.style.width = width + "px";
            if ((width + currentPosition.left) > window.innerWidth) left = currentPosition.left;
        }
        game.settings.set("dsa5", "tokenhotbarPosition", { left: currentPosition.left, top: currentPosition.top })
        return currentPosition
    }

    async updateDSA5Hotbar() {
        const controlled = canvas.tokens.controlled
        this.actor = undefined
        this.showEffects = false
        if (controlled.length === 1) {
            const actor = controlled[0].actor
            if (actor && actor.isOwner) {
                this.actor = actor
            }
        }

        if (controlled.length >= 1) {
            this.showEffects = true
        }
        await this.render(true)
    }
}

class AddEffectDialog extends Dialog {
    static async showDialog() {
        const effects = duplicate(CONFIG.statusEffects).map(x => {
            return {
                label: game.i18n.localize(x.label),
                icon: x.icon,
                description: game.i18n.localize(x.description),
                id: x.id
            }
        }).sort((a, b) => a.label.localeCompare(b.label))

        const dialog = new AddEffectDialog({
            title: game.i18n.localize("CONDITION.add"),
            content: await renderTemplate('systems/dsa5/templates/dialog/addstatusdialog.html', { effects }),
            buttons: {}
        })
        dialog.position.height = Math.ceil(effects.length / 3) * 36 + 170
        dialog.render(true)
    }

    activateListeners(html) {
        super.activateListeners(html);

        html.find('.reactClick').mouseenter((ev) => {
            if (ev.currentTarget.getElementsByClassName("hovermenu").length == 0) {
                let div = document.createElement("div")
                div.classList.add("hovermenu")
                div.style.cssText = "font-size: var(--font-size-20);"
                let conf = document.createElement("i")
                conf.classList.add("fas", "fa-cogs")
                conf.title = game.i18n.localize("ActiveEffects.custom")
                conf.addEventListener("click", async ev => this.configureEffect(ev), false)
                div.appendChild(conf)                
                ev.currentTarget.appendChild(div)
            }
        })
        html.find('.reactClick').mouseleave((ev) => {
            let e = ev.toElement || ev.relatedTarget;
            if (e.parentNode == this || e == this) return;

            ev.currentTarget.querySelectorAll(".hovermenu").forEach((e) => e.remove());
        })

        html.find('.quantity-click').mousedown(ev => {
            const quantityFocus = ev.currentTarget.dataset.quantityfocus
            const target = $(ev.currentTarget)
            if(quantityFocus && !(target.is(":focus"))){
                setTimeout(function() {target.select(), 100})
                return
            }
            const val = { val: Number(target.val()) }
            RuleChaos.increment(ev, val, "val")
            target.val(val.val)
        });

        html.find('.reactClick').click(ev => this.addEffect(ev.currentTarget.dataset.value))

        let filterConditions = ev => this._filterConditions($(ev.currentTarget), html)

        let search = html.find('.conditionSearch')
        search.keyup(event => this._filterConditions($(event.currentTarget), html))
        search[0] && search[0].addEventListener("search", filterConditions, false);
    }

    _filterConditions(tar, html) {
        if (tar.val() != undefined) {
            let val = tar.val().toLowerCase().trim()
            let conditions = html.find('.filterable')
            html.find('.filterHide').removeClass('filterHide')
            conditions.filter(function() {
                return $(this).find('span').text().toLowerCase().trim().indexOf(val) == -1
            }).addClass('filterHide')
        }
    }

    async configureEffect(ev) {
        ev.stopPropagation()
        const elem = $(ev.currentTarget).closest(".reactClick");
        const id = elem.attr("data-value")
        this.close()
        new AddEffectDialog({
            title: game.i18n.localize("CONDITION." + id),
            content: await renderTemplate('systems/dsa5/templates/dialog/configurestatusdialog.html'),
            default: 'add',
            buttons: {
                add: {
                    icon: '<i class="fa fa-check"></i>',
                    label: game.i18n.localize("CONDITION.add"),
                    callback: async(html) => {
                        const options = {}
                        const duration = html.find('[name=unit]:checked').val() == "seconds" ? Math.round(html.find('.duration').val() / 5) : html.find('.duration').val()
                        const label = html.find('.effectname').val()
                        if (duration > 0) {
                            mergeObject(options, RuleChaos._buildDuration(duration))
                        }
                        if (label) {
                            options.label = label
                        }
                        await this.addEffect(id, options)
                    }
                }
            }
        }).render(true, { width: 400, resizable: false, classes: ["dsa5", "dialog"] })
    }

    async addEffect(id, options = {}) {
        const effect = duplicate(CONFIG.statusEffects.find(x => x.id == id))
        if (options) {
            mergeObject(effect, options)
        }
        for (let token of canvas.tokens.controlled) {
            await token.actor.addCondition(effect, 1, false, false)
        }
        game.dsa5.apps.tokenHotbar.render(true)
        this.close()
    }

    static get defaultOptions() {
        const options = super.defaultOptions;

        mergeObject(options, {
            classes: ["dsa5", "tokenStatusEffects"],
            width: 700,
            resizable: true
        });
        return options;
    }
}