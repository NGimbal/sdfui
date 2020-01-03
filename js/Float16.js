(function(){
    //http://en.wikipedia.org/wiki/Half-precision_floating-point_format
    //http://www.khronos.org/registry/gles/extensions/OES/OES_texture_float.txt

    /*
    (-1)^S * 0.0,                        if E == 0 and M == 0,
    (-1)^S * 2^-14 * (M / 2^10),         if E == 0 and M != 0,
    (-1)^S * 2^(E-15) * (1 + M/2^10),    if 0 < E < 31,
    (-1)^S * INF,                        if E == 31 and M == 0, or
    NaN,                                 if E == 31 and M != 0,
    */

    // conversion code //

    var twoPm14 = Math.pow(2, -14);
    var smallest = twoPm14/1024;
    var largest = Math.pow(2, 30-15) * (1 + 1023/1024);

    if(Math.log2 === undefined){
        Math.log2 = function(n){
            return Math.log(n)/Math.LN2;
        }
    }

    var decrement = function(n){
        var sign = n & 0x8000;
        var exponent = (n & 0x7c00) >> 10;
        var mantissa = (n & 0x03ff);

        if(sign == 0){ // positive number
            if(mantissa > 0){ // just decrement mantissa
                if(exponent < 31){ // not from infinity
                    mantissa -= 1;
                }
                else{ // maximum number, decrement from infinity
                    exponent = 30;
                    mantissa = 0x03ff;
                }
            }
            else{
                if(exponent > 0){ // not the smallest range, decrement exponent, set mantissa max;
                    exponent -= 1;
                    mantissa = 0x03ff;
                }
                else{ // number is zero, is negative smallest
                    sign = 0x8000;
                    mantissa = 1;
                }
            }
        }
        else{ // negative number
            if(exponent < 31){
                if(mantissa < 0x03ff){ // just increment mantissa
                    mantissa += 1
                }
                else{ // not already at infinity, bump exponent
                    exponent += 1;
                    mantissa = 0;
                }
            }
        }
        return sign | (exponent << 10) | mantissa;
    }

    var half2num = function(n){
        var sign = 1 - ((n & 0x8000) >> 14);
        var exponent = (n & 0x7c00) >> 10;
        var mantissa = (n & 0x03ff);

        if(exponent === 0){
            if(mantissa !== 0){
                return sign * twoPm14 * (mantissa/1024);
            }
            else{
                return sign * 0;
            }
        }
        else if(exponent < 31){
            return sign * Math.pow(2, exponent-15) * (1 + mantissa/1024);
        }
        else{
            if(mantissa === 0){
                return sign * Infinity;
            }
            else{
                return NaN;
            }
        }
    };

    var round = function(orig, sign, exponent, mantissa){
        mantissa = Math.round(mantissa);
        var result = sign | ((exponent+15) << 10) | mantissa;
        if(mantissa === 0){
            var resultNum = half2num(result);
            if(resultNum > n){
                var lower = decrement(result);
                var lowNum = half2num(lower);
                if(lowNum > -Infinity){
                    var mid = (resultNum + lowNum)/2;
                    if(orig < mid){
                        return lower;
                    }
                }
            }
            else{
                // TODO
            }
        }
        return result;
    }

    var num2half = function(n){
        if(isNaN(n)){
            return 0x7fff;
        }
        else if(n === Infinity || n > largest){
            return 0x7c00;
        }
        else if(n === -Infinity || n < -largest){
            return 0xfc00;
        }
        else if(n === 0){
            return 0;
        }
        else{
            var sign = n < 0 ? 0x8000 : 0;
            var n = Math.abs(n);

            var exponent = Math.log2(n / (1 + 1023/1024));
            exponent = Math.ceil(exponent);

            if(exponent <= -15){
                var mantissa = (n/twoPm14)*1024;
                return round(n, sign, -15, mantissa);
            }
            else{
                var mantissa = (n/Math.pow(2, exponent) - 1)*1024;
                return round(n, sign, exponent, mantissa);
            }
        }
    }


    // tests //
    var bits2num = function(bits){
        var result = 0;
        for(var i=0; i<bits.length; i++){
            if(bits[i] !== ' '){
                result = result << 1;
                result += bits[i] === '1' ? 1 : 0;
            }
        }
        return result;
    };

    var num2bits = function(n){
        var bit = 0x8000;
        var result = '';
        for(var i=0; i<16; i++){
            result += (n & bit) ? '1' : '0';
            bit /= 2;
        }
        return result[0] + ' ' + result.slice(1, 6) + ' ' + result.slice(6, 16);
    }

    var testBits = function(bits, expected){
        var result = half2num(bits2num(bits));
        if(isNaN(expected)){
            if(!isNaN(result)){
                throw 'Test failed: bits=' + bits + ', expected=' + expected + ', result=' + result;
            }
        }
        else if(result !== expected){
            throw 'Test failed: bits=' + bits + ', expected=' + expected + ', result=' + result;
        }
    }

    var testNum = function(n, expected){
        var result = num2half(n);
        var bits = num2bits(result);
        if(bits !== expected){
            throw 'Test failed: bits=' + bits + ', expected=' + expected;
        }
    }

    testBits('0 01111 0000000000', 1);
    testBits('1 01111 0000000000', -1);
    testBits('0 01111 0000000001', 1+Math.pow(2,-10));
    testBits('1 01111 0000000001', -(1+Math.pow(2,-10)));
    testBits('0 11110 1111111111', 65504);
    testBits('1 11110 1111111111', -65504);
    testBits('0 00001 0000000000', Math.pow(2,-14));
    testBits('1 00001 0000000000', -Math.pow(2,-14));
    testBits('0 00000 1111111111', Math.pow(2,-14)-Math.pow(2,-24));
    testBits('1 00000 1111111111', -(Math.pow(2,-14)-Math.pow(2,-24)));
    testBits('0 00000 0000000001', Math.pow(2,-24));
    testBits('1 00000 0000000001', -Math.pow(2,-24));
    testBits('0 00000 0000000000', 0);
    testBits('1 00000 0000000000', -0); // no way to distinguish -0 and 0, meh
    testBits('0 11111 0000000000', Infinity);
    testBits('1 11111 0000000000', -Infinity);
    testBits('0 01101 0101010101', 0.333251953125);
    testBits('1 01101 0101010101', -0.333251953125);
    testBits('0 11111 1111111111', NaN);
    testBits('0 00000 0000000001', smallest);
    testBits('1 00000 0000000001', -smallest);
    testBits('0 11110 1111111111', largest);
    testBits('1 11110 1111111111', -largest);

    testNum(NaN, '0 11111 1111111111');
    testNum(Infinity, '0 11111 0000000000');
    testNum(-Infinity, '1 11111 0000000000');
    testNum(1, '0 01111 0000000000');
    testNum(-1, '1 01111 0000000000');
    testNum(65504, '0 11110 1111111111');
    testNum(-65504, '1 11110 1111111111');
    testNum(1+Math.pow(2,-10), '0 01111 0000000001');
    testNum(-(1+Math.pow(2,-10)), '1 01111 0000000001');
    testNum(Math.pow(2,-14), '0 00001 0000000000');
    testNum(-Math.pow(2,-14), '1 00001 0000000000');
    testNum(Math.pow(2,-14)-Math.pow(2,-24), '0 00000 1111111111');
    testNum(-(Math.pow(2,-14)-Math.pow(2,-24)), '1 00000 1111111111');
    testNum(Math.pow(2,-24), '0 00000 0000000001');
    testNum(-Math.pow(2,-24), '1 00000 0000000001');
    testNum(0, '0 00000 0000000000');
    //testNum(-0, '1 00000 0000000000'); //no way to test
    testNum(0.333251953125, '0 01101 0101010101');
    testNum(-0.333251953125, '1 01101 0101010101');
    testNum(smallest, '0 00000 0000000001');
    testNum(-smallest, '1 00000 0000000001');
    testNum(largest, '0 11110 1111111111');
    testNum(-largest, '1 11110 1111111111');
    testNum(largest+1, '0 11111 0000000000');
    testNum(-largest-1, '1 11111 0000000000');

    // test forth/back conversion
    var maxShort = Math.pow(2, 16);
    for(var i=0; i<maxShort; i++){
        var r = num2half(half2num(i));
        if(r !== i){
            var signI = 1 - ((i & 0x8000) >> 14);
            var exponentI = (i & 0x7c00) >> 10;
            var mantissaI = (i & 0x03ff);

            var signR = 1 - ((i & 0x8000) >> 14);
            var exponentR = (i & 0x7c00) >> 10;
            var mantissaR = (i & 0x03ff);

            if(exponentI == 31 && mantissaI > 0){ // NaN expected, mantissa can be anything but 0
                if(signI !== signR || exponentI !== exponentR || mantissaR === 0){
                    throw 'Did not match expected=' + num2bits(i) + ' result=' + num2bits(r);
                }
            }
            else if(signI == -1 && exponentI == 0 && mantissaI == 0){ // cannot differentiate -0 and 0
                if(exponentI !== exponentR || mantissaI !== mantissaR){
                    throw 'Did not match expected=' + num2bits(i) + ' result=' + num2bits(r);
                }
            }
            else{
                throw 'Did not match expected=' + num2bits(i) + ' result=' + num2bits(r);
            }
        }
    }

    var testRounding = function(low, high){
        var lowN = half2num(low);
        var highN = half2num(high);
        var mid = (lowN+highN)/2;

        for(var i=0; i<6; i++){
            var n = lowN + (highN-lowN)*(i/5);
            var test = half2num(num2half(n));
            if(n < mid){
                if(test >= mid){
                    throw 'Rounding Failed between: low=' + num2bits(low) + ' high=' + num2bits(high);
                }
            }
            else{
                if(test < mid){
                    throw 'Rounding Failed between: low=' + num2bits(low) + ' high=' + num2bits(high);
                }
            }
        }
    }

    // test decrement and rounding
    var higher = num2half(largest);
    while(half2num(higher) != -Infinity){
        var lower = decrement(higher);
        if(half2num(higher) <= half2num(lower)){
            throw 'Decrement failed, high=' + num2bits(higher) + ' low=' + num2bits(lower);
        }
        //testRounding(lower, higher);
        higher = lower;
    }

    //var bits = '1 00000 0000000000';
    //var bits = '0 11101 0000001111';
    //var bits = '0 11101 0000000000';
    //var bits = '0 00000 0000000000';
    //var bits = '0 11110 1111111111';
    var bits = '1 00001 1111111111';
    var high = half2num(bits2num(bits));
    var low = half2num(decrement(bits2num(bits)));
    var mid = (high+low)/2;

    console.log(low, high, (low+high)/2);
    for(var i=0; i<6; i++){
        var n = low+(high-low)*(i/5);
        if(n < mid){
            console.log(half2num(num2half(n)) < mid, num2bits(num2half(n)));
        }
        else{
            console.log(half2num(num2half(n)) >= mid, num2bits(num2half(n)));
        }
    }
})();

class Hfloat16{
  constructor( Uint16 ){
    this.twoPm14 = Math.pow(2, -14);
    this.smallest = this.twoPm14/1024;
    this.largest = Math.pow(2, 30-15) * (1 + 1023/1024);

    this.overrideLog();

    this.hFloat = this.num2half(Uint16);
    this.num = this.half2num(this.hFloat);

    return this;
  }

  //http://en.wikipedia.org/wiki/Half-precision_floating-point_format
  //http://www.khronos.org/registry/gles/extensions/OES/OES_texture_float.txt

  /*
  (-1)^S * 0.0,                        if E == 0 and M == 0,
  (-1)^S * 2^-14 * (M / 2^10),         if E == 0 and M != 0,
  (-1)^S * 2^(E-15) * (1 + M/2^10),    if 0 < E < 31,
  (-1)^S * INF,                        if E == 31 and M == 0, or
  NaN,                                 if E == 31 and M != 0,
  */

  // conversion code //
  overrideLog(){
    if(Math.log2 === undefined){
        Math.log2 = function(n){
            return Math.log(n)/Math.LN2;
        }
    }
  }

  decrement(n){
      var sign = n & 0x8000;
      var exponent = (n & 0x7c00) >> 10;
      var mantissa = (n & 0x03ff);

      if(sign == 0){ // positive number
          if(mantissa > 0){ // just decrement mantissa
              if(exponent < 31){ // not from infinity
                  mantissa -= 1;
              }
              else{ // maximum number, decrement from infinity
                  exponent = 30;
                  mantissa = 0x03ff;
              }
          }
          else{
              if(exponent > 0){ // not the smallest range, decrement exponent, set mantissa max;
                  exponent -= 1;
                  mantissa = 0x03ff;
              }
              else{ // number is zero, is negative smallest
                  sign = 0x8000;
                  mantissa = 1;
              }
          }
      }
      else{ // negative number
          if(exponent < 31){
              if(mantissa < 0x03ff){ // just increment mantissa
                  mantissa += 1
              }
              else{ // not already at infinity, bump exponent
                  exponent += 1;
                  mantissa = 0;
              }
          }
      }
      return sign | (exponent << 10) | mantissa;
  }

  half2num(n){
      var sign = 1 - ((n & 0x8000) >> 14);
      var exponent = (n & 0x7c00) >> 10;
      var mantissa = (n & 0x03ff);

      if(exponent === 0){
          if(mantissa !== 0){
              return sign * this.twoPm14 * (mantissa/1024);
          }
          else{
              return sign * 0;
          }
      }
      else if(exponent < 31){
          return sign * Math.pow(2, exponent-15) * (1 + mantissa/1024);
      }
      else{
          if(mantissa === 0){
              return sign * Infinity;
          }
          else{
              return NaN;
          }
      }
  };

  round(orig, sign, exponent, mantissa){
      mantissa = Math.round(mantissa);
      var result = sign | ((exponent+15) << 10) | mantissa;
      if(mantissa === 0){
          var resultNum = this.half2num(result);
          if(resultNum > n){
              var lower = this.decrement(result);
              var lowNum = this.half2num(lower);
              if(lowNum > -Infinity){
                  var mid = (resultNum + lowNum)/2;
                  if(orig < mid){
                      return lower;
                  }
              }
          }
          else{
              // TODO
          }
      }
      return result;
  }

  num2half(n){
      if(isNaN(n)){
          return 0x7fff;
      }
      else if(n === Infinity || n > this.largest){
          return 0x7c00;
      }
      else if(n === -Infinity || n < -this.largest){
          return 0xfc00;
      }
      else if(n === 0){
          return 0;
      }
      else{
          var sign = n < 0 ? 0x8000 : 0;
          var n = Math.abs(n);

          var exponent = Math.log2(n / (1 + 1023/1024));
          exponent = Math.ceil(exponent);

          if(exponent <= -15){
              var mantissa = (n/this.twoPm14)*1024;
              return this.round(n, sign, -15, mantissa);
          }
          else{
              var mantissa = (n/Math.pow(2, exponent) - 1)*1024;
              return this.round(n, sign, exponent, mantissa);
          }
      }
  }


  // tests //
  static bits2num(bits){
      var result = 0;
      for(var i=0; i<bits.length; i++){
          if(bits[i] !== ' '){
              result = result << 1;
              result += bits[i] === '1' ? 1 : 0;
          }
      }
      return result;
  };

  static num2bits(n){
      var bit = 0x8000;
      var result = '';
      for(var i=0; i<16; i++){
          result += (n & bit) ? '1' : '0';
          bit /= 2;
      }
      return result[0] + ' ' + result.slice(1, 6) + ' ' + result.slice(6, 16);
  }

  static testBits (bits, expected){
      var result = this.half2num(bits2num(bits));
      if(isNaN(expected)){
          if(!isNaN(result)){
              throw 'Test failed: bits=' + bits + ', expected=' + expected + ', result=' + result;
          }
      }
      else if(result !== expected){
          throw 'Test failed: bits=' + bits + ', expected=' + expected + ', result=' + result;
      }
  }

  static testNum(n, expected){
      var result = this.num2half(n);
      var bits = this.num2bits(result);
      if(bits !== expected){
          throw 'Test failed: bits=' + bits + ', expected=' + expected;
      }
  }
}

export {Hfloat16};
