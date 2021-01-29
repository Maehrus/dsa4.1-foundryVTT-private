import DSA5_Utility from "../system/utility-dsa5.js";

export default function() {
    Handlebars.registerHelper('concat', function(a, b) {
        return a + b;
    });
    Handlebars.registerHelper('concatUp', function(a, b) {
        return a + b.toUpperCase();
    });
    Handlebars.registerHelper('mod', function(a, b) {
        return a % b;
    });
    Handlebars.registerHelper('roman', function(a) {
        let roman = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX']
        return roman[a - 1]
    });
    Handlebars.registerHelper("when", function(operand_1, operator, operand_2, options) {
        let operators = {
            'eq': function(l, r) { return l == r; },
            'noteq': function(l, r) { return l != r; },
            'gt': function(l, r) { return Number(l) > Number(r); },
            'or': function(l, r) { return l || r; },
            'and': function(l, r) { return l && r; },
            '%': function(l, r) { return (l % r) === 0; }
        }
        let result = operators[operator](operand_1, operand_2);

        if (result) return options.fn(this);
        else return options.inverse(this);
    });
    Handlebars.registerHelper("diceThingsUp", function(a) {
        return DSA5_Utility.replaceDies(a)
    })
}