class Complex {

    // Constructor.
    constructor(re, im) {
        // Single argument
        if(im === undefined){
            // re is complex
            if(re instanceof Complex) {
                this.re = re.re;
                this.im = re.im;
            }
            // otherwise
            else if(isNaN(re)) {
                throw new Error(`Cannot create Complex from input (${re.toString()} [${typeof(re)}], [undefined]).`);
            }
            else {
                this.re = re;
                this.im = 0.0;
            }    
        }
        // Two arguments
        else {
            if(isNaN(re) || isNaN(im)) {
                throw new Error(`Cannot create Complex from input (${re.toString()} [${typeof(re)}], ${im.toString()} [${typeof(im)}]).`);
            }
            else {
                this.re = re;
                this.im = im;
            }
        }
    }

    static fromPolar(abs, arg) {
        if(isNaN(abs) || isNaN(arg)) {
            throw new Error(`Cannot create Complex from input (${abs.toString()} [${typeof(abs)}], ${arg.toString()} [${typeof(arg)}]): absolute and argument values must both be numbers.`);
        }
        else {
            return new Complex(abs * Math.cos(arg), abs * Math.sin(arg));
        }
    }

    // Getter for the complex number's absolute value (a.k.a. magnitude).
    get abs() {
        return Math.sqrt(this.re*this.re + this.im*this.im);
    }

    // Getter for the complex number's argument.
    get arg() {
        // The argument of zero is undefined.
        if(this.re == 0.0 && this.im == 0.0) {
            return undefined;
        }
        return Math.atan2(this.im, this.re);
    }

    // Getter, returns the conjugate of the complex number, i.e. with imaginary part negated.
    get conjugate() {
        return new Complex(this.re, -this.im);
    }

    // Getter, returns the reciprocal of the complex number, i.e. one divided by it.
    get reciprocal() {
        return Complex.fromPolar(1.0/this.abs, -this.arg);
    }

    // Getter, returns the square root of the complex number.
    get sqrt() {
        return Complex.fromPolar(Math.sqrt(this.abs), this.arg/2.0);
    }

    // Add two Complex numbers. Real numbers will be coerced to Complex.
    static add(a, b) {
        a = new Complex(a);
        b = new Complex(b);
        return new Complex(a.re + b.re, a.im + b.im);
    }

    // Subtract one Complex number from another.
    static subtract(a, b) {
        // Type checking/coercion.
        a = new Complex(a);
        b = new Complex(b);
        return new Complex(a.re - b.re, a.im - b.im);
    }

    // Multiply two Complex numbers.
    static multiply(a, b) {
        // Type checking/coercion.
        a = new Complex(a);
        b = new Complex(b);
        return new Complex(a.re*b.re - a.im*b.im, a.re*b.im + a.im*b.re);
    }

    // Divide one Complex number by another.
    static divide(a, b) {
        // Type checking/coercion.
        a = new Complex(a);
        b = new Complex(b);
        return Complex.multiply(a, b.reciprocal);
    }

    // Static versions of selected methods
    static conjugate(x) {
        // Type checking/coercion.
        x = new Complex(x);
        return x.conjugate;
    }

    static reciprocal(x) {
        // Type checking/coercion.
        x = new Complex(x);
        return x.reciprocal;
    }

    static sqrt(x) {
        // Type checking/coercion.
        x = new Complex(x);
        return x.sqrt;
    }

    // Render Complex to string of form "x + iy".
    toString() {
        var str = this.re.toString()
        if(this.im >= 0.0) {
            str += " + " + this.im.toString();
        }
        else {
            str += " - " + (-this.im).toString();
        }
        return str + "i";
    }

}
