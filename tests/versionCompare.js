/**
 * Version compare
 * 
 * @param String a   Version a
 * @param String b   Version b
 * @return Integer 1 if a is greater than or equal to b, otherwise -1
 */
function versionCompare(a, b)
{
  var partsA = a.toString().split('.');
  var partsB = b.toString().split('.');
  
  var regexp = new RegExp('([0-9]+)(a(lpha)?|b(eta)?|rc?)([0-9]*)$', 'i');
  
  for (var i = 0; i < Math.max(partsA.length, partsB.length); i++)
  {
    var tA = (typeof partsA[i] == 'undefined') ? '0' : partsA[i];
    var tB = (typeof partsB[i] == 'undefined') ? '0' : partsB[i];
    
    // Catch alpha and beta versions
    if ((regs = tA.match(regexp)))
    {
      partsA.push(tA.match(regexp)[2].toLowerCase()[0]);
      
      if (regs[5])
      {
        partsA.push(regs[5]);
      }
      
      tA = tA.replace(/[^0-9]+/g, '');
    }
    
    if ((regs = tB.match(regexp)))
    {
      partsB.push(tB.match(regexp)[2].toLowerCase()[0]);
      
      if (regs[5])
      {
        partsB.push(regs[5]);
      }
      
      tB = tB.replace(/[^0-9]+/g, '');
    }
    
    if (tA == 'a')
    {
      tA = -3;
    }
    
    if (tB == 'a')
    {
      tB = -3;
    }
    
    if (tA == 'b')
    {
      tA = -2;
    }
    
    if (tB == 'b')
    {
      tB = -2;
    }
    
    if (tA == 'r')
    {
      tA = -1;
    }
    
    if (tB == 'r')
    {
      tB = -1;
    }
    
    if (tA.toString().match(/[^\-0-9]/))
    {
      throw new Error('Parse error for the first attribute: ' + tA);
    }
    
    if (tB.toString().match(/[^\-0-9]/))
    {
      throw new Error('Parse error for the second attribute: ' + tB);
    }
    
    // Equal
    if (Number(tA) === Number(tB))
    {
      continue;
    }
    
    if (Number(tA) < Number(tB))
    {
      return -1;
    }
    
    if (Number(tA) > Number(tB))
    {
      return 1;
    }
  }
  
  return 1;
}

