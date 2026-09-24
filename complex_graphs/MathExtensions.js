/**
 * Returns `input`, clamped to the range [lowerBound, upperBound]
 * @param input Assumed to be a number
 * @param lowerBound If input is less than this, lowerBound will be returned. Assumed to be a number.
 * @param upperBound If input is more than this, upperBound will be returned. Assumed to be a number.
 */
Math.clamp = function(x, lowerBound, upperBound) {
    if(upperBound < lowerBound) {
        throw Error('Math.clamp() called with upperBound strictly less than lowerBound.');
    }
    if(x < lowerBound) {
        return lowerBound;
    }
    if(x > upperBound) {
        return upperBound;
    }
    return x;
}

Math.TWOPI = Math.PI * 2.0;
