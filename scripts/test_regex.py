import re
p437 = 'Exemples d’utilisation :'
# U+2019 = right single quote
print('U+2019 in p437:', '’' in p437)
print('Test dot:', bool(re.match(r'^Exemples?\s*(d.utilisation)?\s*:', p437)))
print('Test u2019:', bool(re.match(r'^Exemples?\s*(d[’']utilisation)?\s*:', p437)))
print('Test \\b:', bool(re.match(r'^Exemples?\b', p437)))
