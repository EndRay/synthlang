## BNF Grammar
```
<program>            ::= <statement>* <voice-block>? <statement>*

<voice-block>        ::= 'startvoice' <statement>* 'endvoice'

<statement>          ::= <const-definition> | <const-construction> | <chain> | <reverse-chain>


<const-definition>   ::= identifier '=' (<out-expr> | <in-expr>)
<const-construction> ::= identifier identifier '(' <args> ')'
<construction>       ::= 'new' identifier '(' <args> ')'

<chain>              ::= <out-expr> ('=>' <mid-expr>)* '=>' <in-expr>
<reverse-chain>      ::= <in-expr> ('<=' <mid-expr>)* '<=' <out-expr>


<mid-expr>           ::= <const-construction> | <construction> | <const-access> | '(' <mid-expr> ')'

<out-expr>           ::= <add-expr>
<add-expr>           ::= <mul-expr> (('+' | '-') <mul-expr>)*
<mul-expr>           ::= <mapping-expr> ('*' <mapping-expr>)*
<mapping-expr>       ::= <out-atom> (<mapping> <out-atom>)*
<out-atom>           ::= <mid-expr> | <output-access> | number | ('+' | '-') <out-atom> | '(' <out-expr> ')'
<mapping>            ::= 'bi'? '[' <out-expr> ',' <out-expr> ']'

<in-expr>            ::= <in-atom>
<in-atom>            ::= <mid-expr> | <socket-access> | '(' <in-expr> ')'

<const-access>       ::= identifier
<socket-access>      ::= identifier '.' identifier
<output-access>      ::= identifier ':' identifier


<args>               ::= [ <arg-list> ]
<arg-list>           ::= <arg> (',' <arg>)* [ ',' <kwarg-list> ] | <kwarg-list>
<kwarg-list>         ::= <kwarg> (',' <kwarg>)*
<arg>                ::= <out-expr>
<kwarg>              ::= '.' identifier '=' <out-expr>
```
## Program example
```
ADSR filterEnv(10ms, 0.2s, 0.3, 2s, .gate=gate)
ADSR env(5ms, 0, 1, 3s, .gate=gate)
lfo = new Sine(3s)
Lowpass24db filter(.q = 0)

Drive drive(.gain=3db)
StereoReverb reverb(0.5s)
stereoLfo = new Sine(1s)

filter.cutoff <= filterEnv [10hz, 10000hz] + lfo bi[-12semi, 12semi]

new Saw(pitch)               => filter
new Square(pitch + 12semi)   => filter
new Triangle(pitch - 12semi) => filter => drive => output
                                          drive => reverb
                                                   reverb :left  + stereoLfo bi[0, -6db] => output.left
                                                   reverb :right + stereoLfo bi[-6db, 0] => output.right
```

### TODO
Add mapping for const definition
```
mod bi[-3semi, 3semi] = lfo1 + lfo2
```
should work the same as
```
mod = (lfo1 + lfo2) bi[-3semi, 3semi]
```

Remove "new" keyword and add "_" functionality.

Add class name aliases.

Make it possible to use sockets and outputs in chains, e.g. 
```
osc => stereoFilter.left :lowpass => output.left
```

Multiplying and addition incorrectly works for stereo outputs.