#version 120

// see the GLSL 1.2 specification:
// https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.1.20.pdf

// signed distance function of a cylinder the axis is aligned to z-direction
// code from: https://iquilezles.org/articles/distfunctions/
float sdCappedCylinder( vec3 p, float h, float r )
{
  vec2 d = abs(vec2(length(p.xz),p.y)) - vec2(r,h);
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

// signed distance function of an axis aligned box.
// code from: https://iquilezles.org/articles/distfunctions/
float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

// signed distance function of a sphere
// code from: https://iquilezles.org/articles/distfunctions/
float sdSphere( vec3 p, float s )
{
  return length(p)-s;
}

// here is the parameter use to draw the objects
float len_cylinder = 0.8; // length of the cylinder
float rad_cylinder = 0.45; // radius of the cylinder
float rad_sphere = 0.8; // radius of the sphere
float box_size = 0.6; // size of box

/// singed distance function at the position `pos`
float SDF(vec3 pos)
{
  //float d0 = sdCappedCylinder(pos, len_cylinder, rad_cylinder);
  // write some code to combine the signed distance fields above to design the object described in the README.md
  //return d0; // comment out and define new distance

  // Step 1: 立方体と球の積
  float d_box = sdBox(pos, vec3(box_size));
  float d_sphere = sdSphere(pos, rad_sphere);
  float d_combined1 = max(d_box, d_sphere); // intersection of box and sphere (the left shape)

  // Step 2: 2つの円柱の和
  float d_cylinder1 = sdCappedCylinder(pos, len_cylinder, rad_cylinder);
  float d_cylinder2 = sdCappedCylinder(vec3(pos.y, pos.z, pos.x), len_cylinder, rad_cylinder);
  float d_cross = min(d_cylinder1, d_cylinder2);

  // Step 3: もう一つ円柱を追加
  float d_cylinder3 = sdCappedCylinder(vec3(pos.z, pos.x, pos.y), len_cylinder, rad_cylinder);
  float d_combined2 = min(d_cross, d_cylinder3); // union of cylinders forming the right shape

  // Step 4: 立方体と球の積から3つの円柱の和を引く
  float d_combined3 = max(d_combined1, -d_combined2); // the final shape, left minus right

  return d_combined3;
}

/// RGB color at the position `pos`
vec3 SDF_color(vec3 pos)
{
  // write some code below to return color (RGB from 0 to 1) to paint the object describe in README.md
  //return vec3(0., 1., 0.); // comment out and define new color

  // 円柱の色判定
  float d_cylinder1 = sdCappedCylinder(pos, len_cylinder, rad_cylinder);
  float d_cylinder2 = sdCappedCylinder(vec3(pos.y, pos.z, pos.x), len_cylinder, rad_cylinder);
  float d_cylinder3 = sdCappedCylinder(vec3(pos.z, pos.x, pos.y), len_cylinder, rad_cylinder);

  if (d_cylinder1 < 0.0 || d_cylinder2 < 0.0 || d_cylinder3 < 0.0) {
    return vec3(0.0, 1.0, 0.0); // 緑
  }

  // 球の色判定
  float d_sphere = sdSphere(pos, rad_sphere);
  if (d_sphere < 0.0) {
    return vec3(1.0, 0.0, 0.0); // 青
  }

  // 立方体の色判定
  float d_box = sdBox(pos, vec3(box_size));
  if (d_box < 0.0) {
    return vec3(0.0, 0.0, 1.0); // 赤
  }
  

  return vec3(0.0, 0.0, 0.0); // デフォルト色（万が一のため）
}

uniform float time; // current time given from CPU

void main()
{
  // camera position
  vec3 cam_pos = normalize( vec3(sin(time),cos(time),0.5*sin(time)) );

  // local frame defined on the cameera
  vec3 frame_z = cam_pos;
  vec3 frame_x = normalize(cross(vec3(0,0,1),frame_z));
  vec3 frame_y = cross(frame_z,frame_x);

  // gl_FragCoord: the coordinate of the pixel
  // left-bottom is (0,0), right-top is (W,H)
  // https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/gl_FragCoord.xhtml
  vec2 scr_xy = gl_FragCoord.xy / vec2(500,500) * 2.0 - vec2(1,1); // canonical screen position [-1,+1] x [-1,+1]
  vec3 src = frame_x * scr_xy.x + frame_y * scr_xy.y + frame_z * 1;  // source of ray from pixel
  vec3 dir = -frame_z;  // direction of ray (looking at the origin)

  vec3 pos_cur = src; // the current ray position
  for(int itr=0;itr<60;++itr){
    float s0 = SDF(pos_cur);
    if( s0 < 0.0 ){ // ray starting from inside the object
      gl_FragColor = vec4(1, 0, 0, 1); // paint red
      return;
    }
    if( s0 < 1.0e-3 ){ // the ray hit the implicit surfacee
      float eps = 1.0e-3;
      float sx = SDF(pos_cur+vec3(eps,0,0))-s0; // finite difference x-direction
      float sy = SDF(pos_cur+vec3(0,eps,0))-s0; // finite difference x-direction
      float sz = SDF(pos_cur+vec3(0,0,eps))-s0; // finite difference y-direction
      vec3 nrm = normalize(vec3(sx,sy,sz)); // normal direction
      float coeff = -dot(nrm, dir); // Lambersian reflection. The light is at the camera position.
      vec3 color = SDF_color(pos_cur);
      gl_FragColor = vec4(coeff*color, 1);
      return;
    }
    pos_cur += s0 * dir; // advance ray
  }
  gl_FragColor = vec4(0.9, 0.9, 1.0, 1); // ray doesn't hit the object
}
